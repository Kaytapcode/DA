using AI.Api.Data;
using AI.Api.Filters;
using AI.Api.Jobs;
using AI.Api.Mappings;
using AI.Api.Services;
using FluentValidation;
using FluentValidation.AspNetCore;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Shared.Contracts.Configuration;
using System.Text;

try
{
    DotEnvLoader.LoadFromStandardLocations(Directory.GetCurrentDirectory());
    var builder = WebApplication.CreateBuilder(args);

    // Serilog configuration
    Log.Logger = new LoggerConfiguration()
        .MinimumLevel.Information()
        .WriteTo.Console()
        .WriteTo.File("logs/ai-api-.txt", rollingInterval: RollingInterval.Day)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "AI.Api")
        .CreateLogger();

    builder.Host.UseSerilog(Log.Logger);

    // 200 MB uploads (spec 2.1 / CONTRACT M29)
    builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 209715200);
    builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o => o.MultipartBodyLengthLimit = 209715200);

    builder.Services.AddHttpContextAccessor();

    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString)) throw new InvalidOperationException("ConnectionStrings:DefaultConnection is empty.");
    if (string.IsNullOrWhiteSpace(builder.Configuration["Jwt:Key"])) throw new InvalidOperationException("Jwt:Key is empty.");
    if (!builder.Environment.IsDevelopment() && string.IsNullOrEmpty(builder.Configuration["Internal:ApiKey"])) throw new InvalidOperationException("Internal:ApiKey is required outside Development.");
    builder.Services.AddDbContext<AiDbContext>(options =>
        options.UseNpgsql(connectionString)
    );

    // JWT Authentication
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidAudience = builder.Configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]
                        ?? throw new InvalidOperationException("JWT Key not found")))
            };

            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = context =>
                {
                    var orgId = context.Principal?.FindFirst("org_id")?.Value;
                    var role = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

                    if (orgId != null)
                        context.HttpContext.Items["org_id"] = orgId;
                    if (role != null)
                        context.HttpContext.Items["role"] = role;

                    return Task.CompletedTask;
                }
            };
        });

    // Authorization policies
    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("RequireSysAdmin", policy => policy.RequireRole("SysAdmin"));
        options.AddPolicy("RequireOrgAdmin", policy => policy.RequireRole("SysAdmin", "OrgAdmin"));
        options.AddPolicy("RequireTeacher", policy => policy.RequireRole("SysAdmin", "OrgAdmin", "Teacher"));
        options.AddPolicy("RequireStudent", policy => policy.RequireRole("SysAdmin", "OrgAdmin", "Teacher", "Student"));
    });

    // NOTE (CONTRACT D9): Hangfire runs in-process; the host must be always-on (no scale-to-zero). Each replica runs a server (Postgres storage).
    // Hangfire (T3.12) - background job for daily quota sweep
    builder.Services.AddHangfire(config => config
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(c => c.UseNpgsqlConnection(connectionString)));
    builder.Services.AddHangfireServer();
    builder.Services.AddScoped<QuotaResetJob>();

    // DI registrations
    builder.Services.AddScoped<IAiQuotaService, AiQuotaService>();
    builder.Services.AddScoped<IOrgContextService, OrgContextService>();
    builder.Services.AddSingleton<IAiKeyResolver, AiKeyResolver>();
    builder.Services.AddScoped<IOpenRouterService, OpenRouterService>();
    builder.Services.AddHttpClient();

    // AutoMapper registration
    builder.Services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());

    builder.Services.AddFluentValidationAutoValidation();

    builder.Services.AddControllers();

    // CORS
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
            policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
    });

    var app = builder.Build();

    if (builder.Configuration.GetValue("Database:AutoMigrate", true))
    {
        using var scope = app.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<AiDbContext>().Database.MigrateAsync();
    }

    // Use Serilog request logging
    app.UseSerilogRequestLogging();

    if (app.Environment.IsDevelopment())
        app.MapOpenApi();

    app.UseCors("AllowFrontend");
    app.UseRouting();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    // Hangfire dashboard (admin-only in production; open in dev)
    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        Authorization = [new HangfireSysAdminFilter()]
    });

    // Register recurring job: sweep all expired quotas once per day
    RecurringJob.AddOrUpdate<QuotaResetJob>(
        "quota-reset-sweep",
        job => job.ResetExpiredQuotasAsync(),
        Cron.Daily);

    app.Run();
    return 0;
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("APPLICATION STARTUP FAILED:");
    Console.WriteLine(ex.Message);
    Console.WriteLine(ex.StackTrace);
    Console.ResetColor();
    Log.Fatal(ex, "Startup failed");
    return 1;
}

using Organization.Api.Data;
using Organization.Api.Mappings;
using Organization.Api.Services;
using Organization.Api.Validators;
using Organization.Api.Middleware;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Shared.Contracts.Configuration;
using Shared.Contracts.Requests;
using System.Text;

try
{
    DotEnvLoader.LoadFromStandardLocations(Directory.GetCurrentDirectory());
    var builder = WebApplication.CreateBuilder(args);

    // Serilog configuration
    Log.Logger = new LoggerConfiguration()
        .MinimumLevel.Information()
        .WriteTo.Console()
        .WriteTo.File("logs/organization-api-.txt", rollingInterval: RollingInterval.Day)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "Organization.Api")
        .CreateLogger();

    builder.Host.UseSerilog(Log.Logger);

    builder.Services.AddHttpContextAccessor();

    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        throw new InvalidOperationException("ConnectionStrings:DefaultConnection is empty.");
    if (string.IsNullOrWhiteSpace(builder.Configuration["Jwt:Key"]))
        throw new InvalidOperationException("Jwt:Key is empty.");
    if (!builder.Environment.IsDevelopment() && string.IsNullOrEmpty(builder.Configuration["Internal:ApiKey"]))
        throw new InvalidOperationException("Internal:ApiKey must be set outside Development.");
    builder.Services.AddDbContext<OrganizationDbContext>(options =>
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

    // DI registrations
    builder.Services.AddScoped<IOrganizationRepository, OrganizationRepository>();
    builder.Services.AddScoped<IMemberRepository, MemberRepository>();
    builder.Services.AddScoped<IOrgContextService, OrgContextService>();
    // Identity service client for cross-service user info enrichment
    builder.Services.AddMemoryCache();
    builder.Services.AddHttpClient<IIdentityServiceClient, IdentityServiceClient>();

    // AutoMapper registration
    builder.Services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());

    // FluentValidation registration — auto-validates on every controller action
    builder.Services.AddFluentValidationAutoValidation();
    builder.Services.AddValidatorsFromAssemblyContaining<OrganizationRequestValidator>();

    builder.Services.AddControllers();

    // CORS
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
            policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>())
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
    });

    var app = builder.Build();

    // Use Serilog request logging
    app.UseSerilogRequestLogging();

    if (app.Environment.IsDevelopment())
        app.MapOpenApi();

    app.UseCors("AllowFrontend");
    app.UseMiddleware<GlobalExceptionMiddleware>();
    app.UseRouting();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    // Seed spec-required test organizations and OrgAdmin memberships (Section 5)
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<Organization.Api.Data.OrganizationDbContext>();
        if (builder.Configuration.GetValue("Database:AutoMigrate", true))
            await db.Database.MigrateAsync();
        await Organization.Api.Data.DbInitializer.SeedAsync(db);
    }

    app.Run();
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("APPLICATION STARTUP FAILED:");
    Console.WriteLine(ex.Message);
    Console.WriteLine(ex.StackTrace);
    Console.ResetColor();
    Environment.ExitCode = 1;
}

using SysAdmin.Api.Data;
using SysAdmin.Api.Mappings;
using FluentValidation;
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
        .WriteTo.File("logs/sysadmin-api-.txt", rollingInterval: RollingInterval.Day)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "SysAdmin.Api")
        .CreateLogger();

    builder.Host.UseSerilog(Log.Logger);

    builder.Services.AddHttpContextAccessor();

    // Encrypt AI provider keys at rest (spec §1: SysAdmin "Configure AI API Keys").
    builder.Services.AddDataProtection().SetApplicationName("Lumina.SysAdmin");

    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    builder.Services.AddDbContext<SysAdminDbContext>(options =>
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
    builder.Services.AddScoped<IBannerRepository, BannerRepository>();

    // AutoMapper registration
    builder.Services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());

    // FluentValidation registration
    builder.Services.AddValidatorsFromAssemblies(AppDomain.CurrentDomain.GetAssemblies());

    builder.Services.AddControllers();

    // CORS
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
            policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:5000"
            )
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
    app.UseRouting();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    app.Run();
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("APPLICATION STARTUP FAILED:");
    Console.WriteLine(ex.Message);
    Console.WriteLine(ex.StackTrace);
    Console.ResetColor();
    Console.WriteLine("Press any key to exit...");
    Console.ReadLine();
}

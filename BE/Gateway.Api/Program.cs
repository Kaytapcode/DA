using Gateway.Api.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using System.Text;

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Serilog configuration
    Log.Logger = new LoggerConfiguration()
        .MinimumLevel.Information()
        .WriteTo.Console()
        .WriteTo.File("logs/gateway-api-.txt", rollingInterval: RollingInterval.Day)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "Gateway.Api")
        .CreateLogger();

    builder.Host.UseSerilog(Log.Logger);

    // JWT Authentication - validates tokens before proxying
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
        });

    // Authorization policies (T2.6)
    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("default", policy => policy.RequireAuthenticatedUser());
        options.AddPolicy("RequireSysAdmin", policy => policy.RequireRole("SysAdmin"));
        options.AddPolicy("RequireOrgAdmin", policy => policy.RequireRole("SysAdmin", "OrgAdmin"));
        // "Anonymous" in YARP route config is a YARP built-in keyword → [AllowAnonymous], not a named policy
    });

    // CORS - allow the FE dev server (T1.20)
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
            policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
    });

    builder.Services.AddReverseProxy()
        .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

    var app = builder.Build();

    // Validate routes configuration
    try
    {
        var reverseProxyConfig = builder.Configuration.GetSection("ReverseProxy");
        Log.Logger.Information("ReverseProxy Routes configured: {@Routes}", 
            reverseProxyConfig.GetSection("Routes").GetChildren().Select(x => x.Key));
        Log.Logger.Information("ReverseProxy Clusters configured: {@Clusters}", 
            reverseProxyConfig.GetSection("Clusters").GetChildren().Select(x => x.Key));
    }
    catch (Exception ex)
    {
        Log.Logger.Error(ex, "Error loading reverse proxy configuration");
    }

    // Use Serilog request logging
    app.UseSerilogRequestLogging();

    app.UseCors("AllowFrontend");
    app.UseAuthentication();
    app.UseMiddleware<OrgContextMiddleware>();
    app.UseAuthorization();

    app.MapReverseProxy().RequireCors("AllowFrontend");
    app.Run();
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("******************************************");
    Console.WriteLine("GATEWAY STARTUP FAILED:");
    Console.WriteLine(ex.Message);
    Console.WriteLine(ex.StackTrace);
    Console.WriteLine("******************************************");
    Console.ResetColor();
    Console.WriteLine("Press any key to exit...");
    Console.ReadLine();
}

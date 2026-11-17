using Content.Api.Data;
using Content.Api.Mappings;
using Content.Api.Services;
using Content.Api.Validators;
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
        .WriteTo.File("logs/content-api-.txt", rollingInterval: RollingInterval.Day)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "Content.Api")
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
    foreach (var key in new[] { "Identity:InternalBaseUrl", "Organization:InternalBaseUrl", "Storage:LocalPath" })
        if (string.IsNullOrWhiteSpace(builder.Configuration[key]))
            throw new InvalidOperationException($"{key} is empty.");

    // D6: 200 MB upload limit (Storage:MaxFileSizeBytes) at Kestrel + multipart.
    var maxUploadBytes = builder.Configuration.GetValue<long>("Storage:MaxFileSizeBytes", 209715200);
    builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = maxUploadBytes);
    builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o => o.MultipartBodyLengthLimit = maxUploadBytes);

    builder.Services.AddDbContext<ContentDbContext>(options =>
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
        options.AddPolicy("RequireStudent", policy => policy.RequireRole("SysAdmin", "OrgAdmin", "Teacher", "Student"));
    });

    // MediatR (T2.16 CQRS)
    builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<Program>());

    // DI registrations
    builder.Services.AddScoped<ICourseRepository, CourseRepository>();
    builder.Services.AddScoped<IModuleRepository, ModuleRepository>();
    builder.Services.AddScoped<IContentRepository, ContentRepository>();
    builder.Services.AddScoped<IQuestionRepository, QuestionRepository>();
    builder.Services.AddScoped<IFlashcardRepository, FlashcardRepository>();
    builder.Services.AddScoped<IDocumentRepository, DocumentRepository>();
    builder.Services.AddScoped<IStudentProgressRepository, StudentProgressRepository>();
    builder.Services.AddScoped<IVideoRepository, VideoRepository>();
    builder.Services.AddScoped<IStorageService, LocalStorageService>();
    // Removed: IOrganizationRepository, IUserRepository - use HttpClient through Gateway for inter-service queries
    builder.Services.AddScoped<IOrgContextService, OrgContextService>();
    builder.Services.AddScoped<ICourseAccessService, CourseAccessService>();
    // For service-to-service calls (e.g. auto-provisioning an approved student into the org,
    // and checking org suspension status for the course-access guard).
    builder.Services.AddHttpClient();
    // Every call to another service's /api/internal/** goes through this client (CONTRACT §6).
    builder.Services.AddHttpClient("internal", c =>
    {
        var internalKey = builder.Configuration["Internal:ApiKey"];
        if (!string.IsNullOrEmpty(internalKey))
            c.DefaultRequestHeaders.Add("X-Internal-Key", internalKey);
    });
    builder.Services.AddMemoryCache();

    // AutoMapper registration
    builder.Services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());

    // FluentValidation registration — auto-validates on every controller action
    builder.Services.AddFluentValidationAutoValidation();
    builder.Services.AddValidatorsFromAssemblyContaining<CourseRequestValidator>();

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

    // Apply pending EF migrations on startup (idempotent) unless Database:AutoMigrate=false
    // (e.g. a deploy that runs migrations as a release step).
    if (app.Configuration.GetValue("Database:AutoMigrate", true))
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ContentDbContext>();
        await db.Database.MigrateAsync();
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

    app.Run();
    return 0;
}
catch (Exception ex) when (ex is not HostAbortedException) // let EF design-time tooling stop the host
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("APPLICATION STARTUP FAILED:");
    Console.WriteLine(ex.Message);
    Console.WriteLine(ex.StackTrace);
    Console.ResetColor();
    return 1;
}

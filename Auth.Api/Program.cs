using Auth.Api.Data;
using Auth.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Text;


try
{

    var builder = WebApplication.CreateBuilder(args);

    //var serverVersion = new MySqlServerVersion(new Version(8, 4, 7)); // Giả sử MySQL 8.0
    ////options.UseMySql(connectionString, serverVersion);


    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString))
    );


    // 1. Đăng ký DỊCH VỤ AUTHENTICATION (JWT)
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            // Cấu hình tham số TokenValidationParameters
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                // Các giá trị này phải khớp với giá trị bạn dùng để tạo Token trong TokenService
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidAudience = builder.Configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not found")))
            };
        });

    // 2. Đăng ký các Component (DI)
    builder.Services.AddScoped<IUserRepository, UserRepository>();
    builder.Services.AddScoped<ITokenService, TokenService>();
    builder.Services.AddAuthorization(options =>
    {
        // Thêm chính sách cho phép truy cập ẩn danh (cho login/register)
        options.AddPolicy("Anonymous", policy => policy.RequireAssertion(_ => true));
    });
    builder.Services.AddControllers();

    var app = builder.Build();

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseRouting();

    app.UseHttpsRedirection();

    app.UseAuthentication();

    app.UseAuthorization();

    app.MapControllers();

    app.Run();
}
catch (Exception ex)
{
    // --- IN LỖI RA MÀN HÌNH ---
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("******************************************");
    Console.WriteLine("LOI KHONG THE KHOI DONG APP:");
    Console.WriteLine(ex.Message); // Lỗi tóm tắt
    Console.WriteLine(ex.StackTrace); // Chi tiết lỗi ở dòng nào
    Console.WriteLine("******************************************");
    Console.ResetColor();

    // Giữ màn hình không bị tắt để bạn đọc lỗi
    Console.WriteLine("Nhan phim bat ky de thoat...");
    Console.ReadLine();
}

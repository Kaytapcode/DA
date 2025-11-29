using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;


try
{

    var builder = WebApplication.CreateBuilder(args);

    // Đăng ký dịch vụ xác thực
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            // Lấy thông tin JWT từ cấu hình (appsettings.json)
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                // Đảm bảo các giá trị này KHỚP với giá trị dùng trong Auth Service
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidAudience = builder.Configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not found")))
            };
        });

    // Khởi tạo YARP
    builder.Services.AddReverseProxy()
        .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

    // Thêm Middleware xác thực và phân quyền
    var app = builder.Build();
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapReverseProxy();
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
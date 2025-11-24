using Microsoft.AspNetCore.Mvc;
using BCrypt.Net;
using Auth.Api.Models;
using Auth.Api.Data;
using Auth.Api.Services;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Auth.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly ITokenService _tokenService;

        // Dependency Injection
        public AuthController(IUserRepository userRepository, ITokenService tokenService)
        {
            _userRepository = userRepository;
            _tokenService = tokenService;
        }

        // --------------------------------------------------------
        // Endpoint 1: ĐĂNG KÝ (REGISTER)
        // --------------------------------------------------------
        [HttpPost("register")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            // 1. Kiểm tra User đã tồn tại chưa
            var existingUser = await _userRepository.GetByUsernameAsync(request.Username);
            if (existingUser != null)
            {
                return BadRequest(new { Message = "Tên đăng nhập đã tồn tại." });
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // 3. Tạo Entity User mới
            var newUser = new UserModel
            {
                Username = request.Username,
                Email = request.Email,
                PasswordHash = passwordHash,
                Role = "User" // Gán Role mặc định
            };

            // 4. Lưu vào Database
            await _userRepository.AddAsync(newUser);

            return Ok(new { Message = "Đăng ký thành công." });
        }

        // --------------------------------------------------------
        // Endpoint 2: ĐĂNG NHẬP (LOGIN)
        // --------------------------------------------------------
        [HttpPost("login")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            // 1. Tìm User theo Username
            var user = await _userRepository.GetByUsernameAsync(request.Username);

            if (user == null)
            {
                // Tránh tiết lộ User có tồn tại hay không
                return Unauthorized(new { Message = "Thông tin đăng nhập không hợp lệ." });
            }

            // 2. Xác minh mật khẩu (Sử dụng BCrypt)
            var isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);

            if (!isPasswordValid)
            {
                return Unauthorized(new { Message = "Thông tin đăng nhập không hợp lệ." });
            }

            // 3. Tạo JWT Token (Gọi ITokenService)
            // Lấy Role từ Entity User để đưa vào Token
            var token = _tokenService.CreateToken(user, user.Role);

            // 4. Trả về JWT cho Client
            return Ok(new AuthResponseDto(Token: token, Message: "Đăng nhập thành công."));
        }
    }
}
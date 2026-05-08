using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Identity.Api.Models;
using Identity.Api.Data;
using Identity.Api.Services;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Identity.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly ITokenService _tokenService;
        // private readonly IMemberRepository _memberRepository;  // TODO: Replace with HttpClient call through Gateway

        public AuthController(IUserRepository userRepository, ITokenService tokenService)
        {
            _userRepository = userRepository;
            _tokenService = tokenService;
            // _memberRepository = memberRepository;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            // Fast-path UX checks (not the security boundary — DB unique constraint is)
            if (await _userRepository.UserExistsByUsernameAsync(request.Username))
                return BadRequest(new ApiResponse(Success: false, Message: "Username already exists."));
            if (await _userRepository.UserExistsByEmailAsync(request.Email))
                return BadRequest(new ApiResponse(Success: false, Message: "Email is already in use."));

            try
            {
                var newUser = new UserModel
                {
                    Username = request.Username,
                    Email = request.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                    Role = "Student",
                    FullName = request.Username
                };
                await _userRepository.AddAsync(newUser);
                return Ok(new ApiResponse(Success: true, Message: "Registration successful."));
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("username") == true)
            {
                return BadRequest(new ApiResponse(Success: false, Message: "Username already exists."));
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("email") == true)
            {
                return BadRequest(new ApiResponse(Success: false, Message: "Email is already in use."));
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            // Support login by username or email
            var user = await _userRepository.GetByUsernameAsync(request.Username)
                       ?? await _userRepository.GetByEmailAsync(request.Username);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized(new ApiResponse(Success: false, Message: "Invalid login credentials."));

            // Resolve org context from X-Org-Id header if provided
            Guid? orgId = null;
            // TODO: Verify organization membership via HttpClient call to Organization.Api
            // if (Request.Headers.TryGetValue("X-Org-Id", out var orgIdHeader)
            //     && Guid.TryParse(orgIdHeader.FirstOrDefault(), out var parsedOrgId))
            // {
            //     if (await httpClient.GetAsync(...))
            //         orgId = parsedOrgId;
            // }

            var token = _tokenService.CreateToken(user, orgId);
            return Ok(new ApiResponse<LoginResponseDto>(
                Success: true,
                Data: new LoginResponseDto(
                    Token: token,
                    Message: "Login successful.",
                    User: new UserInfoDto(
                        user.Id,
                        user.Username,
                        user.Email,
                        user.Role,
                        user.IsSystemAdmin,
                        user.FullName,
                        user.Bio,
                        user.Institution,
                        user.Degree
                    ),
                    OrgId: orgId?.ToString()
                ),
                Message: "Login successful."
            ));
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound();

            return Ok(new ApiResponse<UserInfoDto>(
                Success: true,
                Data: new UserInfoDto(
                    user.Id,
                    user.Username,
                    user.Email,
                    user.Role,
                    user.IsSystemAdmin,
                    user.FullName,
                    user.Bio,
                    user.Institution,
                    user.Degree
                ),
                Message: null
            ));
        }

        [HttpPut("me")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequestDto request)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound(new ApiResponse(false, "User not found."));

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var normalizedEmail = request.Email.Trim();
                if (!string.Equals(user.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
                {
                    if (await _userRepository.UserExistsByEmailAsync(normalizedEmail))
                        return BadRequest(new ApiResponse(false, "Email is already in use."));
                    user.Email = normalizedEmail;
                }
            }

            user.FullName = string.IsNullOrWhiteSpace(request.FullName) ? null : request.FullName.Trim();
            user.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();
            user.Institution = string.IsNullOrWhiteSpace(request.Institution) ? null : request.Institution.Trim();
            user.Degree = string.IsNullOrWhiteSpace(request.Degree) ? null : request.Degree.Trim();
            user.UpdatedAt = DateTime.UtcNow;

            await _userRepository.UpdateAsync(user);

            return Ok(new ApiResponse<UserInfoDto>(
                Success: true,
                Data: new UserInfoDto(
                    user.Id,
                    user.Username,
                    user.Email,
                    user.Role,
                    user.IsSystemAdmin,
                    user.FullName,
                    user.Bio,
                    user.Institution,
                    user.Degree
                ),
                Message: "Profile updated."
            ));
        }
    }
}

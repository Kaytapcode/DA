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
        private readonly IOrganizationServiceClient _orgClient;

        public AuthController(IUserRepository userRepository, ITokenService tokenService, IOrganizationServiceClient orgClient)
        {
            _userRepository = userRepository;
            _tokenService = tokenService;
            _orgClient = orgClient;
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
                    Role = "Student"
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

            // Resolve org context from X-Org-Id header if provided, verifying membership inter-service.
            Guid? orgId = null;
            if (Request.Headers.TryGetValue("X-Org-Id", out var orgIdHeader)
                && Guid.TryParse(orgIdHeader.FirstOrDefault(), out var parsedOrgId))
            {
                if (user.Role == "SysAdmin" || await _orgClient.IsUserMemberAsync(user.Id, parsedOrgId))
                    orgId = parsedOrgId;
            }

            var token = _tokenService.CreateToken(user, orgId);
            return Ok(new ApiResponse<LoginResponseDto>(
                Success: true,
                Data: new LoginResponseDto(
                    Token: token,
                    Message: "Login successful.",
                    User: new UserInfoDto(user.Id, user.Username, user.Email, user.Role),
                    OrgId: orgId?.ToString()
                ),
                Message: "Login successful."
            ));
        }

        [HttpGet("me")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound();

            return Ok(new ApiResponse<UserInfoDto>(
                Success: true,
                Data: new UserInfoDto(user.Id, user.Username, user.Email, user.Role),
                Message: null
            ));
        }
    }
}

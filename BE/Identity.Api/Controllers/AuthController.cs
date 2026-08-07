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
        private readonly AuthDbContext _db;
        private readonly IEmailService _emailService;
        private readonly IWebHostEnvironment _env;
        private readonly IConfiguration _config;

        public AuthController(
            IUserRepository userRepository,
            ITokenService tokenService,
            IOrganizationServiceClient orgClient,
            AuthDbContext db,
            IEmailService emailService,
            IWebHostEnvironment env,
            IConfiguration config)
        {
            _userRepository = userRepository;
            _tokenService = tokenService;
            _orgClient = orgClient;
            _db = db;
            _emailService = emailService;
            _env = env;
            _config = config;
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
                // Public registration is always Student. Elevated roles (Teacher, OrgAdmin,
                // SysAdmin) are only assignable by an existing SysAdmin via POST /api/users.
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

            // Resolve org context.
            // OrgAdmin: auto-lookup their org (they manage exactly one; no OrgID input needed).
            // Others: accept an explicit X-Org-Id header (verified against membership).
            Guid? orgId = null;
            if (user.Role == "OrgAdmin")
            {
                orgId = await _orgClient.GetOrgIdForAdminAsync(user.Id);
            }
            else if (Request.Headers.TryGetValue("X-Org-Id", out var orgIdHeader)
                && Guid.TryParse(orgIdHeader.FirstOrDefault(), out var parsedOrgId))
            {
                if (user.Role == "SysAdmin" || await _orgClient.IsUserMemberAsync(user.Id, parsedOrgId))
                    orgId = parsedOrgId;
            }

            var access = _tokenService.CreateAccessToken(user, orgId);
            var refresh = await _tokenService.IssueRefreshTokenAsync(user.Id);

            return Ok(new ApiResponse<LoginResponseDto>(
                Success: true,
                Data: new LoginResponseDto(
                    AccessToken: access.Token,
                    RefreshToken: refresh.Token,
                    AccessTokenExpiresInSeconds: access.ExpiresInSeconds,
                    RefreshTokenExpiresAt: refresh.ExpiresAtUtc,
                    Message: "Login successful.",
                    User: new UserInfoDto(user.Id, user.Username, user.Email, user.Role),
                    OrgId: orgId?.ToString()
                ),
                Message: "Login successful."
            ));
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto request)
        {
            var result = await _tokenService.RotateAsync(request.RefreshToken);
            if (result == null)
                return Unauthorized(new ApiResponse(Success: false, Message: "Invalid or expired refresh token."));

            // Preserve org context through refresh: if X-Org-Id header is present and the user
            // is a member of that org, re-embed org_id in the new access token.
            Guid? orgId = null;
            if (Request.Headers.TryGetValue("X-Org-Id", out var orgIdHeader)
                && Guid.TryParse(orgIdHeader.FirstOrDefault(), out var parsedOrgId))
            {
                if (result.User.Role == "SysAdmin" || await _orgClient.IsUserMemberAsync(result.User.Id, parsedOrgId))
                    orgId = parsedOrgId;
            }

            // Re-create access token with org context when needed
            var access = orgId.HasValue
                ? _tokenService.CreateAccessToken(result.User, orgId)
                : result.AccessToken;

            return Ok(new ApiResponse<LoginResponseDto>(
                Success: true,
                Data: new LoginResponseDto(
                    AccessToken: access.Token,
                    RefreshToken: result.RefreshToken.Token,
                    AccessTokenExpiresInSeconds: access.ExpiresInSeconds,
                    RefreshTokenExpiresAt: result.RefreshToken.ExpiresAtUtc,
                    Message: "Token refreshed.",
                    User: new UserInfoDto(result.User.Id, result.User.Username, result.User.Email, result.User.Role),
                    OrgId: orgId?.ToString()
                ),
                Message: "Token refreshed."
            ));
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] RefreshTokenRequestDto request)
        {
            // Silently succeed even if token is unknown/already-revoked — logout must be idempotent.
            await _tokenService.RevokeAsync(request.RefreshToken);
            return Ok(new ApiResponse(Success: true, Message: "Logged out."));
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
                Data: new UserInfoDto(user.Id, user.Username, user.Email, user.Role, user.Language),
                Message: null
            ));
        }

        // Spec 1 — Profile Management. PATCH self-profile (username + email).
        [HttpPatch("me")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequestDto request)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound();

            if (request.Username != null && request.Username != user.Username)
            {
                if (await _userRepository.UserExistsByUsernameAsync(request.Username))
                    return BadRequest(new ApiResponse(Success: false, Message: "Username already exists."));
                user.Username = request.Username;
            }

            if (request.Email != null && request.Email != user.Email)
            {
                if (await _userRepository.UserExistsByEmailAsync(request.Email))
                    return BadRequest(new ApiResponse(Success: false, Message: "Email is already in use."));
                user.Email = request.Email;
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            return Ok(new ApiResponse<UserInfoDto>(
                Success: true,
                Data: new UserInfoDto(user.Id, user.Username, user.Email, user.Role, user.Language),
                Message: "Profile updated."
            ));
        }

        // Spec 1 — Change Password. Requires correct current password, validates new password strength.
        [HttpPost("change-password")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return Unauthorized();

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                return Unauthorized(new ApiResponse(Success: false, Message: "Current password is incorrect."));

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            return Ok(new ApiResponse(Success: true, Message: "Password changed."));
        }

        // Spec 1 — i18n preference. Supported languages: vi, ja, en. Validated by UpdateLanguageRequestValidator.
        [HttpPatch("me/language")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> UpdateLanguage([FromBody] UpdateLanguageRequestDto request)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound();

            user.Language = request.Language;
            user.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            return Ok(new ApiResponse<UserInfoDto>(
                Success: true,
                Data: new UserInfoDto(user.Id, user.Username, user.Email, user.Role, user.Language),
                Message: "Language preference updated."
            ));
        }

        // Spec 1 — OrgAdmin self-registration. Creates a new OrgAdmin user + a new Organization in one call.
        // The org creation is delegated to Organization.Api via internal endpoint.
        [HttpPost("register/orgadmin")]
        [Microsoft.AspNetCore.Authorization.AllowAnonymous]
        public async Task<IActionResult> RegisterOrgAdmin([FromBody] OrgAdminRegisterRequestDto request, CancellationToken ct)
        {
            if (await _userRepository.UserExistsByUsernameAsync(request.Username))
                return BadRequest(new ApiResponse(Success: false, Message: "Username already exists."));
            if (await _userRepository.UserExistsByEmailAsync(request.Email))
                return BadRequest(new ApiResponse(Success: false, Message: "Email is already in use."));

            UserModel newUser;
            try
            {
                newUser = new UserModel
                {
                    Username = request.Username,
                    Email = request.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                    Role = "OrgAdmin"
                };
                await _userRepository.AddAsync(newUser);
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("username") == true)
            {
                return BadRequest(new ApiResponse(Success: false, Message: "Username already exists."));
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("email") == true)
            {
                return BadRequest(new ApiResponse(Success: false, Message: "Email is already in use."));
            }

            // Create the org and link the new user as OrgAdmin in Organization.Api
            var orgResult = await _orgClient.CreateOrgWithAdminAsync(
                request.OrganizationName, request.OrganizationSlug, newUser.Id, ct);

            if (orgResult == null)
            {
                // Org creation failed — roll back the user to avoid orphaned OrgAdmin accounts
                await _userRepository.DeleteAsync(newUser.Id);
                return StatusCode(502, new ApiResponse(Success: false, Message: "Organization could not be created. Please try again."));
            }

            return Ok(new ApiResponse<OrgAdminRegisterResponseDto>(
                Success: true,
                Data: new OrgAdminRegisterResponseDto(
                    UserId: newUser.Id,
                    Username: newUser.Username,
                    Email: newUser.Email,
                    OrgId: orgResult.OrgId.ToString(),
                    OrgName: orgResult.Name,
                    OrgSlug: orgResult.Slug
                ),
                Message: "OrgAdmin account and organization created successfully."
            ));
        }

        // Spec 1 — Forgot Password. Generates a time-limited reset token and "sends" it to the user's email.
        // In Development mode the raw token is also returned in the response body for testability.
        [HttpPost("forgot-password")]
        [Microsoft.AspNetCore.Authorization.AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request, CancellationToken ct)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email, ct);

            // Always return 200 to prevent email enumeration
            if (user == null)
                return Ok(new ApiResponse(Success: true, Message: "If that email is registered, a reset link has been sent."));

            // Invalidate any previous unused tokens for this user
            var old = await _db.PasswordResetTokens
                .Where(t => t.UserId == user.Id && t.UsedAt == null && t.ExpiresAt > DateTime.UtcNow)
                .ToListAsync(ct);
            _db.PasswordResetTokens.RemoveRange(old);

            // Generate raw token and store its hash
            var rawToken = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32))
                .Replace('+', '-').Replace('/', '_').TrimEnd('=');
            var hash = Convert.ToHexString(
                System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken)));

            _db.PasswordResetTokens.Add(new PasswordResetTokenModel
            {
                UserId = user.Id,
                TokenHash = hash,
                ExpiresAt = DateTime.UtcNow.AddMinutes(30),
            });
            await _db.SaveChangesAsync(ct);

            var frontendBaseUrl = (_config["Frontend:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
            var resetLink = $"{frontendBaseUrl}/reset-password?token={rawToken}";

            await _emailService.SendPasswordResetAsync(user.Email, user.Username, resetLink, ct);

            // Fallback (Spec §1 — chosen behavior "SMTP + on-screen"): when no real SMTP transport
            // is configured (or in Development), surface the reset link so the user/test can proceed
            // without an inbox. When SMTP IS configured, the link travels by email only.
            // Return the link inside the standard ApiResponse envelope so the FE (which reads
            // res.data.resetLink) actually surfaces it. A raw anonymous object here was why the
            // on-screen fallback link never appeared.
            if (!_emailService.IsConfigured || _env.IsDevelopment())
                return Ok(new ApiResponse<object>(
                    Success: true,
                    Data: new { resetLink, devToken = rawToken },
                    Message: "Email delivery is not configured — use this reset link directly."));

            return Ok(new ApiResponse(Success: true, Message: "If that email is registered, a reset link has been sent."));
        }

        // Spec 1 — Reset Password. Validates the token and sets a new password.
        [HttpPost("reset-password")]
        [Microsoft.AspNetCore.Authorization.AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request, CancellationToken ct)
        {
            var hash = Convert.ToHexString(
                System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(request.Token)));

            var tokenRecord = await _db.PasswordResetTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

            if (tokenRecord == null || tokenRecord.UsedAt != null || tokenRecord.ExpiresAt <= DateTime.UtcNow)
                return BadRequest(new ApiResponse(Success: false, Message: "Invalid or expired reset token."));

            tokenRecord.User!.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            tokenRecord.User.UpdatedAt = DateTime.UtcNow;
            tokenRecord.UsedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(new ApiResponse(Success: true, Message: "Password has been reset successfully."));
        }
    }
}

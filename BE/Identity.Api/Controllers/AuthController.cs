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
            // Public registration is always Student. Elevated roles (OrgAdmin, SysAdmin) are only
            // assignable by an existing SysAdmin via POST /api/users.
            var error = await AddUserAsync(new UserModel
            {
                Username = request.Username,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = "Student"
            });
            return error ?? Ok(new ApiResponse(Success: true, Message: "Registration successful."));
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            // Support login by username or email
            var user = await _userRepository.GetByUsernameAsync(request.Username)
                       ?? await _userRepository.GetByEmailAsync(request.Username);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized(new ApiResponse(Success: false, Message: "Invalid login credentials."));

            return await IssueSessionAsync(user, await ResolveOrgIdAsync(user), "Login successful.");
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto request)
        {
            var result = await _tokenService.RotateAsync(request.RefreshToken);
            if (result == null)
                return Unauthorized(new ApiResponse(Success: false, Message: "Invalid or expired refresh token."));

            // CONTRACT M1: re-resolve org context exactly as Login does.
            var orgId = await ResolveOrgIdAsync(result.User);

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
                    User: new UserInfoDto(result.User.Id, result.User.Username, result.User.Email, result.User.Role, result.User.Language),
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
            var newUser = new UserModel
            {
                Username = request.Username,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = "OrgAdmin"
            };
            var error = await AddUserAsync(newUser);
            if (error != null) return error;

            var orgResult = await CreateOrgOrRollbackAsync(newUser, request.OrganizationName, request.OrganizationSlug, ct);
            if (orgResult == null)
                return StatusCode(502, new ApiResponse(Success: false, Message: "Organization could not be created. Please try again."));

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

        public record SsoCompleteProfileRequest(string SsoToken, string Role, string? OrgName, string? OrgSlug);

        // Spec §1 — SSO first login, Role Selection page. The ssoToken comes from POST /api/auth/google
        // (isNewUser=true). Creates the user (+ org for OrgAdmin) through the same paths as register / register/orgadmin.
        [HttpPost("sso/complete-profile")]
        [Microsoft.AspNetCore.Authorization.AllowAnonymous]
        public async Task<IActionResult> CompleteSsoProfile([FromBody] SsoCompleteProfileRequest request, CancellationToken ct)
        {
            var ticket = _tokenService.ValidateSsoTicket(request?.SsoToken ?? "");
            if (ticket == null)
                return Unauthorized(new ApiResponse(Success: false, Message: "SSO session expired. Please sign in with Google again."));

            var isOrgAdmin = request!.Role == "OrgAdmin";
            if (!isOrgAdmin && request.Role != "User")
                return BadRequest(new ApiResponse(Success: false, Message: "Role must be User or OrgAdmin."));

            var orgName = request.OrgName?.Trim() ?? "";
            var orgSlug = request.OrgSlug?.Trim() ?? "";
            if (isOrgAdmin && (orgName.Length is < 2 or > 200
                               || orgSlug.Length is < 1 or > 50
                               || !System.Text.RegularExpressions.Regex.IsMatch(orgSlug, "^[a-z0-9-]+$")))
                return BadRequest(new ApiResponse(Success: false, Message: "Organization name (2-200 chars) and slug (lowercase letters, numbers, hyphens) are required."));

            if (await _userRepository.GetByGoogleSubAsync(ticket.GoogleSub, ct) != null)
                return BadRequest(new ApiResponse(Success: false, Message: "This Google account is already registered. Please sign in."));

            var newUser = new UserModel
            {
                Username = await GenerateUniqueUsernameAsync(ticket.Email, ct),
                Email = ticket.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()), // random; SSO-only
                Role = isOrgAdmin ? "OrgAdmin" : "Student",
                GoogleSub = ticket.GoogleSub,
            };
            var error = await AddUserAsync(newUser);
            if (error != null) return error;

            Guid? orgId = null;
            if (isOrgAdmin)
            {
                var org = await CreateOrgOrRollbackAsync(newUser, orgName, orgSlug, ct);
                if (org == null)
                    return StatusCode(502, new ApiResponse(Success: false, Message: "Organization could not be created. Please try again."));
                orgId = org.OrgId;
            }

            return await IssueSessionAsync(newUser, orgId, "Registration successful.");
        }

        // OrgAdmin: their one org (server-side lookup). Others: an explicit X-Org-Id header verified
        // against membership (SysAdmin unrestricted). Shared by Login and Refresh.
        private async Task<Guid?> ResolveOrgIdAsync(UserModel user)
        {
            if (user.Role == "OrgAdmin")
                return await _orgClient.GetOrgIdForAdminAsync(user.Id);

            if (Request.Headers.TryGetValue("X-Org-Id", out var orgIdHeader)
                && Guid.TryParse(orgIdHeader.FirstOrDefault(), out var parsedOrgId)
                && (user.Role == "SysAdmin" || await _orgClient.IsUserMemberAsync(user.Id, parsedOrgId)))
                return parsedOrgId;

            return null;
        }

        private async Task<IActionResult> IssueSessionAsync(UserModel user, Guid? orgId, string message)
        {
            var access = _tokenService.CreateAccessToken(user, orgId);
            var refresh = await _tokenService.IssueRefreshTokenAsync(user.Id);

            return Ok(new ApiResponse<LoginResponseDto>(
                Success: true,
                Data: new LoginResponseDto(
                    AccessToken: access.Token,
                    RefreshToken: refresh.Token,
                    AccessTokenExpiresInSeconds: access.ExpiresInSeconds,
                    RefreshTokenExpiresAt: refresh.ExpiresAtUtc,
                    Message: message,
                    User: new UserInfoDto(user.Id, user.Username, user.Email, user.Role, user.Language),
                    OrgId: orgId?.ToString()
                ),
                Message: message
            ));
        }

        // Returns an error result on duplicate username/email, null on success.
        private async Task<IActionResult?> AddUserAsync(UserModel user)
        {
            // Fast-path UX checks (not the security boundary — DB unique constraint is)
            if (await _userRepository.UserExistsByUsernameAsync(user.Username))
                return BadRequest(new ApiResponse(Success: false, Message: "Username already exists."));
            if (await _userRepository.UserExistsByEmailAsync(user.Email))
                return BadRequest(new ApiResponse(Success: false, Message: "Email is already in use."));

            try
            {
                await _userRepository.AddAsync(user);
                return null;
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

        // Creates the org with this user as OrgAdmin in Organization.Api; deletes the user if that fails
        // (no orphaned OrgAdmin accounts).
        private async Task<OrgSetupResult?> CreateOrgOrRollbackAsync(UserModel user, string orgName, string orgSlug, CancellationToken ct)
        {
            var org = await _orgClient.CreateOrgWithAdminAsync(orgName, orgSlug, user.Id, ct);
            if (org == null)
                await _userRepository.DeleteAsync(user.Id);
            return org;
        }

        // email local-part as the base, with a short random suffix if needed, to avoid collisions.
        private async Task<string> GenerateUniqueUsernameAsync(string email, CancellationToken ct)
        {
            var baseName = email.Split('@')[0];
            baseName = new string(baseName.Select(c => char.IsLetterOrDigit(c) ? c : '_').ToArray());
            if (baseName.Length > 40) baseName = baseName[..40];
            if (string.IsNullOrWhiteSpace(baseName)) baseName = "user";

            if (await _userRepository.GetByUsernameAsync(baseName, ct) == null) return baseName;
            for (int i = 0; i < 5; i++)
            {
                var candidate = $"{baseName}_{Guid.NewGuid().ToString("N")[..6]}";
                if (await _userRepository.GetByUsernameAsync(candidate, ct) == null) return candidate;
            }
            return $"{baseName}_{Guid.NewGuid().ToString("N")[..10]}";
        }
    }
}

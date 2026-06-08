using Google.Apis.Auth;
using Identity.Api.Data;
using Identity.Api.Models;
using Identity.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.Contracts.Responses;

namespace Identity.Api.Controllers
{
    // Spec §1 — "SSO is available for User and OrgAdmin" (Google OAuth2 / OpenID Connect).
    // The FE obtains a Google ID token (credential) via Google Identity Services and POSTs it here;
    // we verify it server-side against our Google Client ID, find/create the user, and issue Lumina
    // JWTs. SysAdmin cannot use SSO (no Google-created account is ever a SysAdmin).
    [ApiController]
    [Route("api/auth/google")]
    [AllowAnonymous]
    public class GoogleAuthController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly ITokenService _tokenService;
        private readonly IOrganizationServiceClient _orgClient;
        private readonly IConfiguration _config;
        private readonly ILogger<GoogleAuthController> _logger;

        public GoogleAuthController(
            IUserRepository users,
            ITokenService tokenService,
            IOrganizationServiceClient orgClient,
            IConfiguration config,
            ILogger<GoogleAuthController> logger)
        {
            _users = users;
            _tokenService = tokenService;
            _orgClient = orgClient;
            _config = config;
            _logger = logger;
        }

        public record GoogleLoginRequest(string IdToken);

        [HttpPost]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request?.IdToken))
                return BadRequest(new ApiResponse(false, "Missing Google ID token."));

            var clientId = _config["Google:ClientId"];
            if (string.IsNullOrWhiteSpace(clientId))
                return StatusCode(500, new ApiResponse(false, "Google SSO is not configured on the server."));

            GoogleJsonWebSignature.Payload payload;
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings { Audience = new[] { clientId } };
                payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Google ID token validation failed");
                return Unauthorized(new ApiResponse(false, "Invalid Google token."));
            }

            if (string.IsNullOrWhiteSpace(payload.Email))
                return Unauthorized(new ApiResponse(false, "Google account has no email."));

            // Match a returning SSO user by Google subject, else by email (link the Google account
            // to an existing password account).
            var user = await _users.GetByGoogleSubAsync(payload.Subject, ct)
                       ?? await _users.GetByEmailAsync(payload.Email, ct);
            bool isNewUser = user == null;

            if (isNewUser)
            {
                user = new UserModel
                {
                    Id = Guid.NewGuid(),
                    Username = await GenerateUniqueUsernameAsync(payload.Email, ct),
                    Email = payload.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()), // random; SSO-only
                    Role = "Student",
                    GoogleSub = payload.Subject,
                };
                await _users.AddAsync(user, ct);
            }
            else if (string.IsNullOrEmpty(user!.GoogleSub))
            {
                user.GoogleSub = payload.Subject;
                await _users.UpdateAsync(user, ct);
            }

            // OrgAdmin's org context (so the access token carries org_id like a normal login).
            Guid? orgId = user.Role == "OrgAdmin" ? await _orgClient.GetOrgIdForAdminAsync(user.Id, ct) : null;

            var access = _tokenService.CreateAccessToken(user, orgId);
            var refresh = await _tokenService.IssueRefreshTokenAsync(user.Id, ct);

            return Ok(new ApiResponse<object>(true, new
            {
                accessToken = access.Token,
                refreshToken = refresh.Token,
                accessTokenExpiresInSeconds = access.ExpiresInSeconds,
                user = new { id = user.Id, username = user.Username, email = user.Email, role = user.Role },
                orgId = orgId?.ToString(),
                isNewUser,
            }, "Google login successful."));
        }

        // email local-part as the base, with a short random suffix if needed, to avoid collisions.
        private async Task<string> GenerateUniqueUsernameAsync(string email, CancellationToken ct)
        {
            var baseName = email.Split('@')[0];
            baseName = new string(baseName.Select(c => char.IsLetterOrDigit(c) ? c : '_').ToArray());
            if (baseName.Length > 40) baseName = baseName[..40];
            if (string.IsNullOrWhiteSpace(baseName)) baseName = "user";

            if (await _users.GetByUsernameAsync(baseName, ct) == null) return baseName;
            for (int i = 0; i < 5; i++)
            {
                var candidate = $"{baseName}_{Guid.NewGuid().ToString("N")[..6]}";
                if (await _users.GetByUsernameAsync(candidate, ct) == null) return candidate;
            }
            return $"{baseName}_{Guid.NewGuid().ToString("N")[..10]}";
        }
    }
}

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
    // we verify it server-side against our Google Client ID. Existing users get Lumina JWTs; new users get
    // a short-lived ssoToken for POST /api/auth/sso/complete-profile (AuthController). SysAdmin is rejected.
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
            if (!payload.EmailVerified)
                return StatusCode(403, new ApiResponse(false, "Google email is not verified."));

            // Match a returning SSO user by Google subject, else by email (link the Google account
            // to an existing password account).
            var user = await _users.GetByGoogleSubAsync(payload.Subject, ct)
                       ?? await _users.GetByEmailAsync(payload.Email, ct);

            // Spec §1 first SSO login: no user row yet — hand back a signed ticket for the role-selection page.
            if (user == null)
            {
                var ssoToken = _tokenService.CreateSsoTicket(new SsoTicket(payload.Subject, payload.Email, payload.Name));
                return Ok(new ApiResponse<object>(true, new
                {
                    isNewUser = true,
                    ssoToken,
                    email = payload.Email,
                    fullName = payload.Name,
                }, "Complete your profile to finish signing up."));
            }

            // Spec §1: SysAdmin cannot use SSO.
            if (user.Role == "SysAdmin")
                return StatusCode(403, new ApiResponse(false, "SysAdmin accounts cannot sign in with SSO."));

            if (string.IsNullOrEmpty(user.GoogleSub))
            {
                user.GoogleSub = payload.Subject;
                await _users.UpdateAsync(user, ct);
            }

            // OrgAdmin's org context (so the access token carries org_id like a normal login).
            Guid? orgId = user.Role == "OrgAdmin" ? await _orgClient.GetOrgIdForAdminAsync(user.Id, ct) : null;

            var access = _tokenService.CreateAccessToken(user, orgId);
            var refresh = await _tokenService.IssueRefreshTokenAsync(user.Id, ct);

            return Ok(new ApiResponse<LoginResponseDto>(true, new LoginResponseDto(
                AccessToken: access.Token,
                RefreshToken: refresh.Token,
                AccessTokenExpiresInSeconds: access.ExpiresInSeconds,
                RefreshTokenExpiresAt: refresh.ExpiresAtUtc,
                Message: "Google login successful.",
                User: new UserInfoDto(user.Id, user.Username, user.Email, user.Role, user.Language),
                OrgId: orgId?.ToString()
            ), "Google login successful."));
        }
    }
}

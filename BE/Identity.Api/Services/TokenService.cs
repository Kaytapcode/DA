using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Identity.Api.Data;
using Identity.Api.Models;

namespace Identity.Api.Services
{
    public record AccessTokenResult(string Token, DateTime ExpiresAtUtc, int ExpiresInSeconds);

    public record RefreshTokenResult(string Token, DateTime ExpiresAtUtc);

    public record RotationResult(AccessTokenResult AccessToken, RefreshTokenResult RefreshToken, UserModel User, Guid? OrgId);

    public interface ITokenService
    {
        AccessTokenResult CreateAccessToken(UserModel user, Guid? orgId = null);
        Task<RefreshTokenResult> IssueRefreshTokenAsync(Guid userId, CancellationToken ct = default);
        Task<RotationResult?> RotateAsync(string plaintextRefreshToken, CancellationToken ct = default);
        Task<bool> RevokeAsync(string plaintextRefreshToken, CancellationToken ct = default);
    }

    public class TokenService : ITokenService
    {
        private readonly IConfiguration _config;
        private readonly IUserRepository _users;
        private readonly IRefreshTokenRepository _refreshTokens;
        private readonly SymmetricSecurityKey _signingKey;
        private readonly int _accessTokenMinutes;
        private readonly int _refreshTokenDays;

        public TokenService(IConfiguration config, IUserRepository users, IRefreshTokenRepository refreshTokens)
        {
            _config = config;
            _users = users;
            _refreshTokens = refreshTokens;
            _signingKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"] ??
                                       throw new ArgumentNullException("JWT Key not configured."))
            );
            _accessTokenMinutes = int.TryParse(_config["Jwt:AccessTokenMinutes"], out var m) ? m : 30;
            _refreshTokenDays = int.TryParse(_config["Jwt:RefreshTokenDays"], out var d) ? d : 30;
        }

        public AccessTokenResult CreateAccessToken(UserModel user, Guid? orgId = null)
        {
            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Name, user.Username),
                new(ClaimTypes.Role, user.Role),
            };

            if (orgId.HasValue)
                claims.Add(new Claim("org_id", orgId.Value.ToString()));

            var expires = DateTime.UtcNow.AddMinutes(_accessTokenMinutes);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = expires,
                Issuer = _config["Jwt:Issuer"],
                Audience = _config["Jwt:Audience"],
                SigningCredentials = new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256)
            };

            var handler = new JwtSecurityTokenHandler();
            var token = handler.WriteToken(handler.CreateToken(tokenDescriptor));
            return new AccessTokenResult(token, expires, _accessTokenMinutes * 60);
        }

        public async Task<RefreshTokenResult> IssueRefreshTokenAsync(Guid userId, CancellationToken ct = default)
        {
            var plaintext = GenerateOpaqueToken();
            var expires = DateTime.UtcNow.AddDays(_refreshTokenDays);
            await _refreshTokens.AddAsync(new RefreshTokenModel
            {
                UserId = userId,
                TokenHash = Hash(plaintext),
                ExpiresAt = expires
            }, ct);
            return new RefreshTokenResult(plaintext, expires);
        }

        public async Task<RotationResult?> RotateAsync(string plaintextRefreshToken, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(plaintextRefreshToken)) return null;

            var existing = await _refreshTokens.GetByHashAsync(Hash(plaintextRefreshToken), ct);
            if (existing == null) return null;

            // Reuse detection: if a previously-rotated token is presented again, kill the whole chain.
            if (existing.RevokedAt != null)
            {
                await _refreshTokens.RevokeAllForUserAsync(existing.UserId, ct);
                return null;
            }

            if (existing.ExpiresAt <= DateTime.UtcNow) return null;

            var user = await _users.GetByIdAsync(existing.UserId, ct);
            if (user == null) return null;

            var newRt = await IssueRefreshTokenAsync(existing.UserId, ct);
            existing.RevokedAt = DateTime.UtcNow;
            existing.ReplacedById = await _refreshTokens.GetByHashAsync(Hash(newRt.Token), ct)
                .ContinueWith(t => t.Result?.Id, ct);
            await _refreshTokens.UpdateAsync(existing, ct);

            var access = CreateAccessToken(user);
            return new RotationResult(access, newRt, user, null);
        }

        public async Task<bool> RevokeAsync(string plaintextRefreshToken, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(plaintextRefreshToken)) return false;
            var existing = await _refreshTokens.GetByHashAsync(Hash(plaintextRefreshToken), ct);
            if (existing == null || existing.RevokedAt != null) return false;
            existing.RevokedAt = DateTime.UtcNow;
            await _refreshTokens.UpdateAsync(existing, ct);
            return true;
        }

        private static string GenerateOpaqueToken()
        {
            // 512 bits of entropy, URL-safe base64
            var bytes = RandomNumberGenerator.GetBytes(64);
            return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        }

        private static string Hash(string input)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes);
        }
    }
}

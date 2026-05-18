using Identity.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Identity.Api.Data
{
    public interface IRefreshTokenRepository
    {
        Task AddAsync(RefreshTokenModel token, CancellationToken ct = default);
        Task<RefreshTokenModel?> GetByHashAsync(string tokenHash, CancellationToken ct = default);
        Task UpdateAsync(RefreshTokenModel token, CancellationToken ct = default);
        Task RevokeAllForUserAsync(Guid userId, CancellationToken ct = default);
    }

    public class RefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly AuthDbContext _db;

        public RefreshTokenRepository(AuthDbContext db) { _db = db; }

        public async Task AddAsync(RefreshTokenModel token, CancellationToken ct = default)
        {
            if (token.Id == Guid.Empty) token.Id = Guid.NewGuid();
            token.CreatedAt = DateTime.UtcNow;
            _db.RefreshTokens.Add(token);
            await _db.SaveChangesAsync(ct);
        }

        public Task<RefreshTokenModel?> GetByHashAsync(string tokenHash, CancellationToken ct = default) =>
            _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

        public async Task UpdateAsync(RefreshTokenModel token, CancellationToken ct = default)
        {
            _db.RefreshTokens.Update(token);
            await _db.SaveChangesAsync(ct);
        }

        public async Task RevokeAllForUserAsync(Guid userId, CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            await _db.RefreshTokens
                .Where(t => t.UserId == userId && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);
        }
    }
}

using AI.Api.Data;
using AI.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AI.Api.Services
{
    public interface IAiQuotaService
    {
        Task<bool> CanMakeCallAsync(Guid orgId);
        Task IncrementUsageAsync(Guid orgId);
        Task<AiQuotaModel> GetOrCreateAsync(Guid orgId);
        Task SetLimitAsync(Guid orgId, int limit);
        Task ResetUsageAsync(Guid orgId);
    }

    public class AiQuotaService : IAiQuotaService
    {
        private readonly AiDbContext _context;

        public AiQuotaService(AiDbContext context) => _context = context;

        public async Task<AiQuotaModel> GetOrCreateAsync(Guid orgId)
        {
            var quota = await _context.AiQuotas.FirstOrDefaultAsync(q => q.OrgId == orgId);

            if (quota != null)
            {
                // Auto-reset if monthly window passed
                if (DateTime.UtcNow >= quota.ResetDate)
                {
                    quota.CallsUsed = 0;
                    quota.ResetDate = DateTime.UtcNow.AddMonths(1);
                    await _context.SaveChangesAsync();
                }
                return quota;
            }

            quota = new AiQuotaModel
            {
                Id = Guid.NewGuid(),
                OrgId = orgId,
                CallsUsed = 0,
                CallsLimit = 100,
                ResetDate = DateTime.UtcNow.AddMonths(1),
                CreatedAt = DateTime.UtcNow
            };
            _context.AiQuotas.Add(quota);
            await _context.SaveChangesAsync();
            return quota;
        }

        public async Task<bool> CanMakeCallAsync(Guid orgId)
        {
            var quota = await GetOrCreateAsync(orgId);
            return quota.CallsUsed < quota.CallsLimit;
        }

        public async Task IncrementUsageAsync(Guid orgId)
        {
            var quota = await GetOrCreateAsync(orgId);
            quota.CallsUsed++;
            await _context.SaveChangesAsync();
        }

        public async Task SetLimitAsync(Guid orgId, int limit)
        {
            var quota = await GetOrCreateAsync(orgId);
            quota.CallsLimit = limit;
            await _context.SaveChangesAsync();
        }

        public async Task ResetUsageAsync(Guid orgId)
        {
            var quota = await GetOrCreateAsync(orgId);
            quota.CallsUsed = 0;
            quota.ResetDate = DateTime.UtcNow.AddMonths(1);
            await _context.SaveChangesAsync();
        }
    }
}

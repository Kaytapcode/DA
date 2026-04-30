using AI.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AI.Api.Jobs;

public class QuotaResetJob
{
    private readonly AiDbContext _context;
    private readonly ILogger<QuotaResetJob> _logger;

    public QuotaResetJob(AiDbContext context, ILogger<QuotaResetJob> logger)
    {
        _context = context;
        _logger = logger;
    }

    // Sweeps all quotas whose ResetDate has passed and resets them.
    // Scheduled daily so inactive orgs are reset even if never queried.
    public async Task ResetExpiredQuotasAsync()
    {
        var now = DateTime.UtcNow;
        var expired = await _context.AiQuotas
            .Where(q => q.ResetDate <= now)
            .ToListAsync();

        if (expired.Count == 0)
        {
            _logger.LogInformation("QuotaResetJob: no expired quotas found.");
            return;
        }

        foreach (var quota in expired)
        {
            quota.CallsUsed = 0;
            quota.ResetDate = now.AddMonths(1);
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("QuotaResetJob: reset {Count} expired quota(s).", expired.Count);
    }
}

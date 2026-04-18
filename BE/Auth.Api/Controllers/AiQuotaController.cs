using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Auth.Api.Services;
using Shared.Contracts.Responses;

namespace Auth.Api.Controllers
{
    [ApiController]
    [Route("api/ai-quota")]
    [Authorize]
    public class AiQuotaController : ControllerBase
    {
        private readonly IAiQuotaService _quotaService;
        private readonly IOrgContextService _orgCtx;

        public AiQuotaController(IAiQuotaService quotaService, IOrgContextService orgCtx)
        {
            _quotaService = quotaService;
            _orgCtx = orgCtx;
        }

        // GET /api/ai-quota — current org's quota status
        [HttpGet]
        public async Task<IActionResult> GetQuota()
        {
            var orgId = _orgCtx.GetCurrentOrgId();
            if (!orgId.HasValue) return BadRequest(new ApiResponse(false, "No org context."));

            var quota = await _quotaService.GetOrCreateAsync(orgId.Value);
            return Ok(new ApiResponse<object>(true, new
            {
                quota.OrgId,
                quota.CallsUsed,
                quota.CallsLimit,
                Remaining = quota.CallsLimit - quota.CallsUsed,
                quota.ResetDate
            }, null));
        }

        // PATCH /api/ai-quota/limit — SysAdmin sets quota limit per org
        [HttpPatch("limit")]
        [Authorize(Policy = "RequireSysAdmin")]
        public async Task<IActionResult> SetLimit([FromBody] SetQuotaLimitRequest request)
        {
            if (request.Limit < 0) return BadRequest(new ApiResponse(false, "Limit must be >= 0."));
            await _quotaService.SetLimitAsync(request.OrgId, request.Limit);
            return Ok(new ApiResponse(true, $"Quota limit set to {request.Limit}."));
        }

        // POST /api/ai-quota/reset — SysAdmin resets usage for an org
        [HttpPost("reset")]
        [Authorize(Policy = "RequireSysAdmin")]
        public async Task<IActionResult> ResetUsage([FromBody] ResetQuotaRequest request)
        {
            await _quotaService.ResetUsageAsync(request.OrgId);
            return Ok(new ApiResponse(true, "Quota usage reset."));
        }
    }

    public record SetQuotaLimitRequest(Guid OrgId, int Limit);
    public record ResetQuotaRequest(Guid OrgId);
}


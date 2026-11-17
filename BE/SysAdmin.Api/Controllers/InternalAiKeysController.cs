using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Responses;
using SysAdmin.Api.Data;

namespace SysAdmin.Api.Controllers
{
    // CONTRACT M10: service-to-service lookup for AI.Api. Not routed by the gateway.
    [ApiController]
    [Route("api/internal/ai-keys")]
    [AllowAnonymous]
    public class InternalAiKeysController : ControllerBase
    {
        private const string ProtectorPurpose = "Lumina.SysAdmin.AiKey.v1";

        private readonly SysAdminDbContext _db;
        private readonly IDataProtector _protector;
        private readonly IConfiguration _config;

        public InternalAiKeysController(SysAdminDbContext db, IDataProtectionProvider dp, IConfiguration config)
        {
            _db = db;
            _protector = dp.CreateProtector(ProtectorPurpose);
            _config = config;
        }

        // GET /api/internal/ai-keys/active?provider=OpenRouter -> { success, data: { provider, apiKey, lastFour } }
        [HttpGet("active")]
        public async Task<IActionResult> GetActive([FromQuery] string provider, CancellationToken ct)
        {
            var expected = _config["Internal:ApiKey"];
            if (!string.IsNullOrEmpty(expected) && Request.Headers["X-Internal-Key"].ToString() != expected)
                return Unauthorized(new ApiResponse(false, "Invalid internal key."));

            if (string.IsNullOrWhiteSpace(provider))
                return BadRequest(new ApiResponse(false, "Provider is required."));

            var entity = await _db.AiKeys.AsNoTracking()
                .FirstOrDefaultAsync(k => k.Provider == provider && k.IsActive, ct);
            if (entity == null) return NotFound(new ApiResponse(false, "No active key for provider."));

            try
            {
                var plaintext = _protector.Unprotect(entity.KeyCiphertext);
                return Ok(new ApiResponse<object>(true, new { provider = entity.Provider, apiKey = plaintext, lastFour = entity.KeyLastFour }, null));
            }
            catch (Exception)
            {
                return StatusCode(500, new ApiResponse(false, "Failed to decrypt key."));
            }
        }
    }
}

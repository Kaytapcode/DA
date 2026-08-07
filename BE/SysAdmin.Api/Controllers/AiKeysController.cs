using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;
using SysAdmin.Api.Data;
using SysAdmin.Api.Models;

namespace SysAdmin.Api.Controllers
{
    [ApiController]
    [Route("api/sysadmin/ai-keys")]
    [Authorize(Policy = "RequireSysAdmin")]
    public class AiKeysController : ControllerBase
    {
        private const string ProtectorPurpose = "Lumina.SysAdmin.AiKey.v1";

        private readonly SysAdminDbContext _db;
        private readonly IDataProtector _protector;

        public AiKeysController(SysAdminDbContext db, IDataProtectionProvider dataProtection)
        {
            _db = db;
            _protector = dataProtection.CreateProtector(ProtectorPurpose);
        }

        private static AiKeyResponseDto ToDto(AiKeyModel k) =>
            new(k.Id, k.Provider, k.Label, k.KeyLastFour, k.IsActive, k.CreatedAt, k.UpdatedAt);

        private static string LastFour(string apiKey) =>
            apiKey.Length <= 4 ? apiKey : apiKey[^4..];

        // GET /api/sysadmin/ai-keys
        [HttpGet]
        public async Task<IActionResult> List(CancellationToken ct)
        {
            var keys = await _db.AiKeys.AsNoTracking()
                .OrderByDescending(k => k.CreatedAt)
                .ToListAsync(ct);

            return Ok(new ApiResponse<IEnumerable<AiKeyResponseDto>>(true, keys.Select(ToDto), null));
        }

        // POST /api/sysadmin/ai-keys
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAiKeyRequestDto request, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(new ApiResponse(false, "Invalid request data."));

            // If this key is being activated, deactivate the existing active key for the same provider
            // (only one active key per provider at a time).
            if (request.IsActive)
            {
                var existingActive = await _db.AiKeys
                    .Where(k => k.Provider == request.Provider && k.IsActive)
                    .ToListAsync(ct);
                foreach (var k in existingActive)
                {
                    k.IsActive = false;
                    k.UpdatedAt = DateTime.UtcNow;
                }
            }

            var entity = new AiKeyModel
            {
                Id = Guid.NewGuid(),
                Provider = request.Provider,
                Label = request.Label,
                KeyCiphertext = _protector.Protect(request.ApiKey),
                KeyLastFour = LastFour(request.ApiKey),
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _db.AiKeys.Add(entity);
            await _db.SaveChangesAsync(ct);

            return Ok(new ApiResponse<AiKeyResponseDto>(true, ToDto(entity), "AI key saved."));
        }

        // PATCH /api/sysadmin/ai-keys/{id}
        [HttpPatch("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAiKeyRequestDto request, CancellationToken ct)
        {
            var entity = await _db.AiKeys.FirstOrDefaultAsync(k => k.Id == id, ct);
            if (entity == null) return NotFound(new ApiResponse(false, "AI key not found."));

            if (request.Label != null) entity.Label = request.Label;

            if (!string.IsNullOrEmpty(request.ApiKey))
            {
                entity.KeyCiphertext = _protector.Protect(request.ApiKey);
                entity.KeyLastFour = LastFour(request.ApiKey);
            }

            if (request.IsActive.HasValue)
            {
                if (request.IsActive.Value)
                {
                    var siblings = await _db.AiKeys
                        .Where(k => k.Provider == entity.Provider && k.IsActive && k.Id != entity.Id)
                        .ToListAsync(ct);
                    foreach (var s in siblings) { s.IsActive = false; s.UpdatedAt = DateTime.UtcNow; }
                }
                entity.IsActive = request.IsActive.Value;
            }

            entity.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return Ok(new ApiResponse<AiKeyResponseDto>(true, ToDto(entity), "AI key updated."));
        }

        // DELETE /api/sysadmin/ai-keys/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            var entity = await _db.AiKeys.FirstOrDefaultAsync(k => k.Id == id, ct);
            if (entity == null) return NotFound(new ApiResponse(false, "AI key not found."));

            _db.AiKeys.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return Ok(new ApiResponse(true, "AI key removed."));
        }

        // GET /api/sysadmin/ai-keys/active?provider=OpenRouter
        // Internal endpoint AI.Api will call to fetch the plaintext active key for a provider.
        // Network-restricted in deployment; protected by SysAdmin role for direct use.
        [HttpGet("active")]
        public async Task<IActionResult> GetActivePlaintext([FromQuery] string provider, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(provider))
                return BadRequest(new ApiResponse(false, "Provider is required."));

            var entity = await _db.AiKeys.AsNoTracking()
                .FirstOrDefaultAsync(k => k.Provider == provider && k.IsActive, ct);
            if (entity == null) return NotFound(new ApiResponse(false, "No active key for provider."));

            string plaintext;
            try
            {
                plaintext = _protector.Unprotect(entity.KeyCiphertext);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(false, $"Failed to decrypt key: {ex.Message}"));
            }

            return Ok(new ApiResponse<object>(true, new { provider = entity.Provider, apiKey = plaintext, lastFour = entity.KeyLastFour }, null));
        }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Identity.Api.Data;
using Shared.Contracts.Responses;

namespace Identity.Api.Controllers
{
    // User search endpoint accessible to OrgAdmin (to find users for adding to their org)
    // and SysAdmin. Returns limited public info only (no password hashes or sensitive data).
    [ApiController]
    [Route("api/users/lookup")]
    [Authorize(Roles = "OrgAdmin,SysAdmin")]
    public class UserLookupController : ControllerBase
    {
        private readonly IUserRepository _users;

        public UserLookupController(IUserRepository users)
        {
            _users = users;
        }

        // GET /api/users/lookup?q=<username_or_email>&limit=10
        [HttpGet]
        public async Task<IActionResult> Lookup(
            [FromQuery] string? q,
            [FromQuery] int limit = 10,
            CancellationToken ct = default)
        {
            if (limit is < 1 or > 50) limit = 10;

            var (items, _) = await _users.SearchAsync(q, 0, limit, ct);
            var result = items.Select(u => new UserInfoDto(u.Id, u.Username, u.Email, u.Role));
            return Ok(new ApiResponse<IEnumerable<UserInfoDto>>(true, result, null));
        }
    }
}

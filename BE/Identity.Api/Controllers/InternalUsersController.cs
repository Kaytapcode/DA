using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Identity.Api.Data;
using Shared.Contracts.Responses;

namespace Identity.Api.Controllers
{
    // Internal service-to-service endpoint — no JWT required.
    // Protected at the network level (not exposed through the public Gateway).
    [Route("api/internal/users")]
    [ApiController]
    [AllowAnonymous]
    public class InternalUsersController : ControllerBase
    {
        private readonly IUserRepository _userRepository;

        public InternalUsersController(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        // GET /api/internal/users/batch?ids=uuid1&ids=uuid2&...
        [HttpGet("batch")]
        public async Task<IActionResult> GetUsersBatch(
            [FromQuery] List<Guid> ids,
            CancellationToken ct)
        {
            if (ids == null || ids.Count == 0)
                return Ok(new ApiResponse<IEnumerable<UserInfoDto>>(true, [], null));

            var users = await _userRepository.GetByIdsAsync(ids, ct);
            var result = users.Select(u => new UserInfoDto(u.Id, u.Username, u.Email, u.Role, u.IsSystemAdmin));
            return Ok(new ApiResponse<IEnumerable<UserInfoDto>>(true, result, null));
        }
    }
}

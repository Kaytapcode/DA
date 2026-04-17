using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Auth.Api.Data;
using Shared.Contracts.Responses;

namespace Auth.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "RequireSysAdmin")]
    public class UsersController : ControllerBase
    {
        private readonly IUserRepository _userRepo;

        public UsersController(IUserRepository userRepo) => _userRepo = userRepo;

        // GET /api/users?query=&pageIndex=0&pageSize=20
        [HttpGet]
        public async Task<IActionResult> GetUsers(
            [FromQuery] string? query,
            [FromQuery] int pageIndex = 0,
            [FromQuery] int pageSize = 20)
        {
            if (pageSize > 100) pageSize = 100;

            var (items, total) = await _userRepo.SearchAsync(query, pageIndex, pageSize);

            var data = items.Select(u => new
            {
                u.Id,
                u.Username,
                u.Email,
                u.Role,
                u.IsSystemAdmin,
                u.CreatedAt,
            });

            return Ok(new
            {
                success = true,
                data,
                pageIndex,
                pageSize,
                totalCount = total,
            });
        }
    }
}

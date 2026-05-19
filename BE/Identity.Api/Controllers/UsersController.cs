using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Identity.Api.Data;
using Identity.Api.Models;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Identity.Api.Controllers
{
    // Global user management — SysAdmin only.
    // This is the ONLY way to create accounts with elevated roles (Teacher, OrgAdmin, SysAdmin).
    [ApiController]
    [Route("api/users")]
    [Authorize(Roles = "SysAdmin")]
    public class UsersController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly AuthDbContext _db;

        public UsersController(IUserRepository users, AuthDbContext db)
        {
            _users = users;
            _db = db;
        }

        // GET /api/users?query=&pageIndex=0&pageSize=20
        [HttpGet]
        public async Task<IActionResult> Search(
            [FromQuery] string? query,
            [FromQuery] int pageIndex = 0,
            [FromQuery] int pageSize = 20,
            CancellationToken ct = default)
        {
            if (pageSize is < 1 or > 100) pageSize = 20;
            if (pageIndex < 0) pageIndex = 0;

            var (items, total) = await _users.SearchAsync(query, pageIndex, pageSize, ct);
            return Ok(new PaginatedResponse<UserInfoDto>(
                Success: true,
                Data: items.Select(u => new UserInfoDto(u.Id, u.Username, u.Email, u.Role)).ToList(),
                PageIndex: pageIndex,
                PageSize: pageSize,
                TotalCount: total,
                Message: null
            ));
        }

        // GET /api/users/{id}
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        {
            var user = await _users.GetByIdAsync(id, ct);
            if (user == null) return NotFound(new ApiResponse(false, "User not found."));
            return Ok(new ApiResponse<UserInfoDto>(true, new UserInfoDto(user.Id, user.Username, user.Email, user.Role), null));
        }

        // POST /api/users — create user with any role (including SysAdmin).
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUserRequestDto request, CancellationToken ct)
        {
            if (await _users.UserExistsByUsernameAsync(request.Username, ct))
                return BadRequest(new ApiResponse(false, "Username already exists."));
            if (await _users.UserExistsByEmailAsync(request.Email, ct))
                return BadRequest(new ApiResponse(false, "Email is already in use."));

            var user = new UserModel
            {
                Username = request.Username,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = request.Role
            };
            await _users.AddAsync(user, ct);

            return Ok(new ApiResponse<UserInfoDto>(
                true,
                new UserInfoDto(user.Id, user.Username, user.Email, user.Role),
                $"User '{user.Username}' created with role {user.Role}."));
        }

        // PATCH /api/users/{id} — update profile/role/password.
        [HttpPatch("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequestDto request, CancellationToken ct)
        {
            var user = await _users.GetByIdAsync(id, ct);
            if (user == null) return NotFound(new ApiResponse(false, "User not found."));

            if (!string.IsNullOrWhiteSpace(request.Username)) user.Username = request.Username.Trim();
            if (!string.IsNullOrWhiteSpace(request.Email)) user.Email = request.Email.Trim();
            if (!string.IsNullOrWhiteSpace(request.Password))
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            if (!string.IsNullOrWhiteSpace(request.Role) && request.Role != user.Role)
            {
                // Prevent removing the last SysAdmin (would lock the system out)
                if (user.Role == "SysAdmin" && request.Role != "SysAdmin")
                {
                    var remainingSysAdmins = await _db.Users.CountAsync(u => u.Role == "SysAdmin" && u.Id != user.Id, ct);
                    if (remainingSysAdmins == 0)
                        return BadRequest(new ApiResponse(false, "Cannot demote the last SysAdmin."));
                }
                user.Role = request.Role;
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _users.UpdateAsync(user, ct);

            return Ok(new ApiResponse<UserInfoDto>(
                true,
                new UserInfoDto(user.Id, user.Username, user.Email, user.Role),
                "User updated."));
        }

        // DELETE /api/users/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            var callerId = GetCallerId();
            if (callerId == id)
                return BadRequest(new ApiResponse(false, "You cannot delete your own account."));

            var user = await _users.GetByIdAsync(id, ct);
            if (user == null) return NotFound(new ApiResponse(false, "User not found."));

            if (user.Role == "SysAdmin")
            {
                var remainingSysAdmins = await _db.Users.CountAsync(u => u.Role == "SysAdmin" && u.Id != user.Id, ct);
                if (remainingSysAdmins == 0)
                    return BadRequest(new ApiResponse(false, "Cannot delete the last SysAdmin."));
            }

            await _users.DeleteAsync(id, ct);
            return Ok(new ApiResponse(true, "User deleted."));
        }

        private Guid? GetCallerId()
        {
            var raw = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }
}

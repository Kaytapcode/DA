using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.Contracts.Responses
{
    public record AuthResponseDto(
        string Token,
        string Message
    );

    public record LoginResponseDto(
        string Token,
        string Message,
        UserInfoDto User,
        string? OrgId = null
    );

    public record UserInfoDto(
        Guid Id,
        string Username,
        string Email,
        string Role,
        bool IsSystemAdmin
    );
}

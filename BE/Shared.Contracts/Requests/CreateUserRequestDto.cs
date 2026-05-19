namespace Shared.Contracts.Requests
{
    // SysAdmin-only payload — supports any role, including SysAdmin itself.
    // The public /auth/register endpoint hard-codes role=Student and ignores this DTO.
    public record CreateUserRequestDto(
        string Username,
        string Email,
        string Password,
        string Role
    );

    public record UpdateUserRequestDto(
        string? Username,
        string? Email,
        string? Role,
        string? Password
    );
}

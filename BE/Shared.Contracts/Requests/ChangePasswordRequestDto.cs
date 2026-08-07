namespace Shared.Contracts.Requests
{
    public record ChangePasswordRequestDto(
        string CurrentPassword,
        string NewPassword
    );
}

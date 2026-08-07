namespace Shared.Contracts.Requests
{
    public record ResetPasswordRequestDto(string Token, string NewPassword);
}

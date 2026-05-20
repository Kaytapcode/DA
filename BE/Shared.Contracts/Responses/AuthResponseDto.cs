namespace Shared.Contracts.Responses
{
    public record AuthResponseDto(
        string Token,
        string Message
    );

    public record LoginResponseDto(
        string AccessToken,
        string RefreshToken,
        int AccessTokenExpiresInSeconds,
        DateTime RefreshTokenExpiresAt,
        string Message,
        UserInfoDto User,
        string? OrgId = null
    );

    public record UserInfoDto(
        Guid Id,
        string Username,
        string Email,
        string Role,
        string? Language = null
    );
}

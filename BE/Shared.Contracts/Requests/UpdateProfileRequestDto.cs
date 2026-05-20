namespace Shared.Contracts.Requests
{
    public record UpdateProfileRequestDto(
        string? Username = null,
        string? Email = null
    );
}

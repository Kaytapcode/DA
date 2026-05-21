namespace Shared.Contracts.Responses
{
    public record OrgAdminRegisterResponseDto(
        Guid UserId,
        string Username,
        string Email,
        string OrgId,
        string OrgName,
        string OrgSlug
    );
}

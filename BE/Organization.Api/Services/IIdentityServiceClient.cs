namespace Organization.Api.Services
{
    public interface IIdentityServiceClient
    {
        Task<Dictionary<Guid, (string Username, string Email)>> GetUsersAsync(
            IEnumerable<Guid> userIds, CancellationToken ct = default);
    }
}

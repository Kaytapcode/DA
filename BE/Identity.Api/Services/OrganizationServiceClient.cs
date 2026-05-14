using Shared.Contracts.Responses;
using System.Net.Http.Json;

namespace Identity.Api.Services
{
    public interface IOrganizationServiceClient
    {
        Task<bool> IsUserMemberAsync(Guid userId, Guid orgId, CancellationToken ct = default);
    }

    public class OrganizationServiceClient : IOrganizationServiceClient
    {
        private readonly HttpClient _http;
        private readonly string _baseUrl;

        public OrganizationServiceClient(HttpClient http, IConfiguration config)
        {
            _http = http;
            _baseUrl = config["Organization:InternalBaseUrl"]?.TrimEnd('/')
                ?? "http://localhost:5002";
        }

        public async Task<bool> IsUserMemberAsync(Guid userId, Guid orgId, CancellationToken ct = default)
        {
            try
            {
                var url = $"{_baseUrl}/api/internal/orgs/{orgId}/members/{userId}";
                var response = await _http.GetFromJsonAsync<ApiResponse<MembershipCheckDto>>(url, ct);
                return response?.Data?.IsMember == true;
            }
            catch
            {
                // Organization.Api unavailable — fail closed (treat as non-member).
                return false;
            }
        }

        private record MembershipCheckDto(bool IsMember, string? Role);
    }
}

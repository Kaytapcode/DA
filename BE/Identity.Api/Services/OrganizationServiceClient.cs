using Shared.Contracts.Responses;
using System.Net.Http.Json;

namespace Identity.Api.Services
{
    public interface IOrganizationServiceClient
    {
        Task<bool> IsUserMemberAsync(Guid userId, Guid orgId, CancellationToken ct = default);
        Task<OrgSetupResult?> CreateOrgWithAdminAsync(string name, string slug, Guid adminUserId, CancellationToken ct = default);
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

        public async Task<OrgSetupResult?> CreateOrgWithAdminAsync(string name, string slug, Guid adminUserId, CancellationToken ct = default)
        {
            try
            {
                var url = $"{_baseUrl}/api/internal/orgs/setup";
                var payload = new { Name = name, Slug = slug, AdminUserId = adminUserId };
                var res = await _http.PostAsJsonAsync(url, payload, ct);
                if (!res.IsSuccessStatusCode) return null;
                var body = await res.Content.ReadFromJsonAsync<ApiResponse<OrgSetupResult>>(cancellationToken: ct);
                return body?.Data;
            }
            catch
            {
                return null;
            }
        }

        private record MembershipCheckDto(bool IsMember, string? Role);
    }

    public record OrgSetupResult(Guid OrgId, string Name, string Slug);
}

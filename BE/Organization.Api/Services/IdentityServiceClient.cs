using Microsoft.Extensions.Caching.Memory;
using Shared.Contracts.Responses;
using System.Net.Http.Json;

namespace Organization.Api.Services
{
    public class IdentityServiceClient : IIdentityServiceClient
    {
        private readonly HttpClient _http;
        private readonly IMemoryCache _cache;
        private readonly string _baseUrl;

        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);
        private const string CacheKeyPrefix = "user_info_";

        public IdentityServiceClient(HttpClient http, IMemoryCache cache, IConfiguration config)
        {
            _http = http;
            _cache = cache;
            _baseUrl = config["Identity:InternalBaseUrl"]?.TrimEnd('/')
                ?? "http://localhost:5001";
        }

        public async Task<Dictionary<Guid, (string Username, string Email)>> GetUsersAsync(
            IEnumerable<Guid> userIds, CancellationToken ct = default)
        {
            var result = new Dictionary<Guid, (string, string)>();
            var uncachedIds = new List<Guid>();

            foreach (var id in userIds)
            {
                var key = $"{CacheKeyPrefix}{id}";
                if (_cache.TryGetValue(key, out (string, string) cached))
                    result[id] = cached;
                else
                    uncachedIds.Add(id);
            }

            if (uncachedIds.Count == 0)
                return result;

            try
            {
                var queryString = string.Join("&", uncachedIds.Select(id => $"ids={id}"));
                var url = $"{_baseUrl}/api/internal/users/batch?{queryString}";

                var response = await _http.GetFromJsonAsync<ApiResponse<IEnumerable<UserInfoDto>>>(url, ct);

                if (response?.Data != null)
                {
                    foreach (var user in response.Data)
                    {
                        var info = (user.Username, user.Email);
                        result[user.Id] = info;
                        _cache.Set($"{CacheKeyPrefix}{user.Id}", info, CacheTtl);
                    }
                }
            }
            catch
            {
                // Identity.Api unavailable — return what we have from cache; callers handle empty values
            }

            return result;
        }
    }
}

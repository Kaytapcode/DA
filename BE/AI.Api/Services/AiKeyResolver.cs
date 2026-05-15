using System.Text.Json;

namespace AI.Api.Services
{
    public interface IAiKeyResolver
    {
        // Returns the active API key for the given provider. Prefers the SysAdmin-managed key
        // stored in SysAdmin.Api; falls back to configuration when no managed key is available
        // or when the lookup fails. Caches successful lookups for ~60s.
        Task<string?> ResolveAsync(string provider, CancellationToken ct = default);
    }

    public class AiKeyResolver : IAiKeyResolver
    {
        private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<AiKeyResolver> _logger;

        private readonly object _cacheLock = new();
        private readonly Dictionary<string, (string Value, DateTime ExpiresAt)> _cache = new();

        public AiKeyResolver(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            IHttpContextAccessor httpContextAccessor,
            ILogger<AiKeyResolver> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        public async Task<string?> ResolveAsync(string provider, CancellationToken ct = default)
        {
            lock (_cacheLock)
            {
                if (_cache.TryGetValue(provider, out var entry) && entry.ExpiresAt > DateTime.UtcNow)
                    return entry.Value;
            }

            var managed = await FetchFromSysAdminAsync(provider, ct);
            if (!string.IsNullOrEmpty(managed))
            {
                lock (_cacheLock) _cache[provider] = (managed, DateTime.UtcNow + CacheTtl);
                return managed;
            }

            // Fallback: config-supplied key (dev / bootstrap). No caching — the value is already
            // in-process and free to read.
            return provider switch
            {
                "OpenRouter" => _configuration["OpenRouter:ApiKey"],
                "OpenAI" => _configuration["OpenAI:ApiKey"],
                "Anthropic" => _configuration["Anthropic:ApiKey"],
                _ => null
            };
        }

        private async Task<string?> FetchFromSysAdminAsync(string provider, CancellationToken ct)
        {
            var baseUrl = _configuration["SysAdmin:InternalBaseUrl"];
            if (string.IsNullOrWhiteSpace(baseUrl)) return null;

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);

                var token = _httpContextAccessor.HttpContext?.Request.Headers["Authorization"].ToString();
                if (!string.IsNullOrEmpty(token))
                    client.DefaultRequestHeaders.Add("Authorization", token);

                var url = $"{baseUrl.TrimEnd('/')}/api/sysadmin/ai-keys/active?provider={Uri.EscapeDataString(provider)}";
                var response = await client.GetAsync(url, ct);
                if (!response.IsSuccessStatusCode) return null;

                var stream = await response.Content.ReadAsStreamAsync(ct);
                using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
                if (!doc.RootElement.TryGetProperty("data", out var dataEl)) return null;
                if (!dataEl.TryGetProperty("apiKey", out var keyEl)) return null;
                return keyEl.GetString();
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "SysAdmin AI-key lookup failed for {Provider} — falling back to config", provider);
                return null;
            }
        }
    }
}

using System.ComponentModel.DataAnnotations;

namespace Shared.Contracts.Requests
{
    public record CreateAiKeyRequestDto(
        [Required]
        [RegularExpression("^(OpenRouter|OpenAI|Anthropic)$", ErrorMessage = "Provider must be OpenRouter, OpenAI, or Anthropic")]
        string Provider,

        [StringLength(100)]
        string? Label,

        [Required(ErrorMessage = "API key is required")]
        [StringLength(500, MinimumLength = 8)]
        string ApiKey,

        bool IsActive = true
    );

    public record UpdateAiKeyRequestDto(
        [StringLength(100)]
        string? Label,

        // When provided, rotates the stored ciphertext.
        [StringLength(500, MinimumLength = 8)]
        string? ApiKey,

        bool? IsActive
    );
}

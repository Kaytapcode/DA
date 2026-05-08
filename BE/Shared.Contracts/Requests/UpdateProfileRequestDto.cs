using System;

namespace Shared.Contracts.Requests
{
    public record UpdateProfileRequestDto(
        string? FullName,
        string? Email,
        string? Bio,
        string? Institution,
        string? Degree
    );
}

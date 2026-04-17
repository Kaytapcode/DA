using System;
using System.Collections.Generic;

namespace Shared.Contracts.Responses
{
    public record ApiResponse<T>(
        bool Success,
        T? Data,
        string? Message,
        List<string>? Errors = null
    );

    public record ApiResponse(
        bool Success,
        string? Message,
        List<string>? Errors = null
    );

    public record PaginatedResponse<T>(
        bool Success,
        List<T> Data,
        int PageIndex,
        int PageSize,
        int TotalCount,
        string? Message,
        List<string>? Errors = null
    )
    {
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
        public bool HasNextPage => PageIndex < TotalPages - 1;
        public bool HasPreviousPage => PageIndex > 0;
    }
}

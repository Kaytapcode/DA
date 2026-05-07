using Content.Api.Data;
using MediatR;
using Shared.Contracts.Responses;

namespace Content.Api.CQRS.Courses.Queries;

public record SearchCoursesQuery(
    Guid OrgId,
    string SearchTerm,
    int PageIndex,
    int PageSize) : IRequest<IEnumerable<CourseListResponseDto>>;

public class SearchCoursesQueryHandler : IRequestHandler<SearchCoursesQuery, IEnumerable<CourseListResponseDto>>
{
    private readonly ICourseRepository _repo;

    public SearchCoursesQueryHandler(ICourseRepository repo) => _repo = repo;

    public async Task<IEnumerable<CourseListResponseDto>> Handle(SearchCoursesQuery query, CancellationToken ct)
    {
        var results = await _repo.SearchAsync(query.OrgId, query.SearchTerm, query.PageIndex, query.PageSize, ct);
        return results.Select(c => new CourseListResponseDto(c.Id, c.Title, c.Description, c.CourseCode, c.CreatedAt));
    }
}

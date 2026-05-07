using Content.Api.Data;
using MediatR;
using Shared.Contracts.Responses;

namespace Content.Api.CQRS.Courses.Queries;

public record GetCoursesQuery(
    Guid? OrgId,
    bool IsSysAdmin,
    int PageIndex,
    int PageSize) : IRequest<PaginatedResponse<CourseListResponseDto>>;

public class GetCoursesQueryHandler : IRequestHandler<GetCoursesQuery, PaginatedResponse<CourseListResponseDto>>
{
    private readonly ICourseRepository _repo;

    public GetCoursesQueryHandler(ICourseRepository repo) => _repo = repo;

    public async Task<PaginatedResponse<CourseListResponseDto>> Handle(GetCoursesQuery query, CancellationToken ct)
    {
        List<Shared.Contracts.Responses.CourseListResponseDto> items;
        int total;

        if (query.IsSysAdmin)
        {
            var all = await _repo.GetAllAsync(query.PageIndex, query.PageSize, ct);
            items = all.ConvertAll(c => new CourseListResponseDto(c.Id, c.Title, c.Description, c.CourseCode, c.CreatedAt, c.CourseModules?.Count ?? 0));
            total = await _repo.GetTotalCountAsync(ct);
        }
        else
        {
            var (courses, count) = await _repo.GetByOrgIdAsync(query.OrgId!.Value, query.PageIndex, query.PageSize, ct);
            items = courses.ConvertAll(c => new CourseListResponseDto(c.Id, c.Title, c.Description, c.CourseCode, c.CreatedAt, c.CourseModules?.Count ?? 0));
            total = count;
        }

        return new PaginatedResponse<CourseListResponseDto>(true, items, query.PageIndex, query.PageSize, total, "Courses retrieved successfully");
    }
}

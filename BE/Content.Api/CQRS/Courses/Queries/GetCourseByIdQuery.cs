using Content.Api.Data;
using MediatR;
using Shared.Contracts.Responses;

namespace Content.Api.CQRS.Courses.Queries;

public record GetCourseByIdQuery(
    Guid CourseId,
    Guid? OrgId,
    bool IsSysAdmin) : IRequest<CourseResponseDto?>;

public class GetCourseByIdQueryHandler : IRequestHandler<GetCourseByIdQuery, CourseResponseDto?>
{
    private readonly ICourseRepository _repo;

    public GetCourseByIdQueryHandler(ICourseRepository repo) => _repo = repo;

    public async Task<CourseResponseDto?> Handle(GetCourseByIdQuery query, CancellationToken ct)
    {
        var course = await _repo.GetByIdAsync(query.CourseId);
        if (course == null) return null;
        if (!query.IsSysAdmin && course.OrgId != query.OrgId) return null;

        return new CourseResponseDto(course.Id, course.OrgId, course.Title,
            course.Description, course.CourseCode, course.CreatedBy, course.CreatedAt);
    }
}

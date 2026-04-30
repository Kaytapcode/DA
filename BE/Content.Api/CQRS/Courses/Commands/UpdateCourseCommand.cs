using Content.Api.Data;
using MediatR;
using Shared.Contracts.Responses;

namespace Content.Api.CQRS.Courses.Commands;

public record UpdateCourseCommand(
    Guid CourseId,
    Guid? OrgId,
    bool IsSysAdmin,
    string Title,
    string? Description,
    string? CourseCode) : IRequest<CourseResponseDto?>;

public class UpdateCourseCommandHandler : IRequestHandler<UpdateCourseCommand, CourseResponseDto?>
{
    private readonly ICourseRepository _repo;

    public UpdateCourseCommandHandler(ICourseRepository repo) => _repo = repo;

    public async Task<CourseResponseDto?> Handle(UpdateCourseCommand cmd, CancellationToken ct)
    {
        var course = await _repo.GetByIdAsync(cmd.CourseId);
        if (course == null) return null;
        if (!cmd.IsSysAdmin && course.OrgId != cmd.OrgId) return null;

        course.Title = cmd.Title;
        course.Description = cmd.Description;
        course.CourseCode = cmd.CourseCode;

        var updated = await _repo.UpdateAsync(course);
        return new CourseResponseDto(updated.Id, updated.OrgId, updated.Title,
            updated.Description, updated.CourseCode, updated.CreatedBy, updated.CreatedAt);
    }
}

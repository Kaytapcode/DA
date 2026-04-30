using Content.Api.Data;
using MediatR;

namespace Content.Api.CQRS.Courses.Commands;

public record SetCourseStatusCommand(
    Guid CourseId,
    string Status,
    Guid? OrgId,
    bool IsSysAdmin) : IRequest<bool>;

public class SetCourseStatusCommandHandler : IRequestHandler<SetCourseStatusCommand, bool>
{
    private readonly ICourseRepository _repo;

    public SetCourseStatusCommandHandler(ICourseRepository repo) => _repo = repo;

    public async Task<bool> Handle(SetCourseStatusCommand cmd, CancellationToken ct)
    {
        var course = await _repo.GetByIdAsync(cmd.CourseId);
        if (course == null) return false;
        if (!cmd.IsSysAdmin && course.OrgId != cmd.OrgId) return false;

        course.Status = cmd.Status;
        await _repo.UpdateAsync(course);
        return true;
    }
}

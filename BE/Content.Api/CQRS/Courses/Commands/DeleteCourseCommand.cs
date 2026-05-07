using Content.Api.Data;
using MediatR;

namespace Content.Api.CQRS.Courses.Commands;

public record DeleteCourseCommand(
    Guid CourseId,
    Guid? OrgId,
    bool IsSysAdmin) : IRequest<bool>;

public class DeleteCourseCommandHandler : IRequestHandler<DeleteCourseCommand, bool>
{
    private readonly ICourseRepository _repo;

    public DeleteCourseCommandHandler(ICourseRepository repo) => _repo = repo;

    public async Task<bool> Handle(DeleteCourseCommand cmd, CancellationToken ct)
    {
        var course = await _repo.GetByIdAsync(cmd.CourseId, ct);
        if (course == null) return false;
        if (!cmd.IsSysAdmin && course.OrgId != cmd.OrgId) return false;

        await _repo.DeleteAsync(cmd.CourseId, ct);
        return true;
    }
}

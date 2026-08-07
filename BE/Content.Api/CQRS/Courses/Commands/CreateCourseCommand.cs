using Content.Api.Data;
using Content.Api.Models;
using MediatR;
using Shared.Contracts.Responses;

namespace Content.Api.CQRS.Courses.Commands;

public record CreateCourseCommand(
    Guid OrgId,
    Guid CreatedBy,
    string Title,
    string? Description,
    string? CourseCode) : IRequest<CourseResponseDto>;

public class CreateCourseCommandHandler : IRequestHandler<CreateCourseCommand, CourseResponseDto>
{
    private readonly ICourseRepository _repo;
    private readonly IModuleRepository _moduleRepo;

    public CreateCourseCommandHandler(ICourseRepository repo, IModuleRepository moduleRepo)
    {
        _repo = repo;
        _moduleRepo = moduleRepo;
    }

    public async Task<CourseResponseDto> Handle(CreateCourseCommand cmd, CancellationToken ct)
    {
        var course = new CourseModel
        {
            OrgId = cmd.OrgId,
            CreatedBy = cmd.CreatedBy,
            Title = cmd.Title,
            Description = cmd.Description,
            CourseCode = cmd.CourseCode
        };

        var created = await _repo.CreateAsync(course, ct);

        // Every new course starts with three default modules: "Topic 1/2/3" (course-only — this
        // does NOT apply to personal Collections, which are created elsewhere).
        for (var i = 1; i <= 3; i++)
        {
            await _moduleRepo.CreateAsync(new ModuleModel
            {
                OrgId = created.OrgId,
                CreatedBy = created.CreatedBy,
                Title = $"Topic {i}",
            }, created.Id, ct);
        }

        return new CourseResponseDto(created.Id, created.OrgId, created.Title,
            created.Description, created.CourseCode, created.CreatedBy, created.CreatedAt);
    }
}

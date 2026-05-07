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

    public CreateCourseCommandHandler(ICourseRepository repo) => _repo = repo;

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
        return new CourseResponseDto(created.Id, created.OrgId, created.Title,
            created.Description, created.CourseCode, created.CreatedBy, created.CreatedAt);
    }
}

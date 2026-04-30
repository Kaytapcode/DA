using FluentValidation;
using Shared.Contracts.Requests;

namespace Content.Api.Validators
{
    public class CourseRequestValidator : AbstractValidator<CourseRequestDto>
    {
        public CourseRequestValidator()
        {
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage("Course title is required")
                .Length(3, 255).WithMessage("Course title must be between 3 and 255 characters");

            RuleFor(x => x.Description)
                .MaximumLength(1000).WithMessage("Description must not exceed 1000 characters");
        }
    }

    public class ModuleContentRequestValidator : AbstractValidator<ModuleContentRequestDto>
    {
        public ModuleContentRequestValidator()
        {
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage("Module/Content title is required")
                .Length(3, 255).WithMessage("Title must be between 3 and 255 characters");

            RuleFor(x => x.Description)
                .MaximumLength(1000).WithMessage("Description must not exceed 1000 characters");
        }
    }
}

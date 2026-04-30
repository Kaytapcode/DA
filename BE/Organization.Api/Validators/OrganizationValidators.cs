using FluentValidation;
using Shared.Contracts.Requests;

namespace Organization.Api.Validators
{
    public class OrganizationRequestValidator : AbstractValidator<CreateOrganizationRequestDto>
    {
        public OrganizationRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Organization name is required")
                .Length(2, 200).WithMessage("Organization name must be between 2 and 200 characters");

            RuleFor(x => x.Address)
                .MaximumLength(500).WithMessage("Address must not exceed 500 characters");
        }
    }

    public class MemberRequestValidator : AbstractValidator<CreateMemberRequestDto>
    {
        public MemberRequestValidator()
        {
            RuleFor(x => x.UserId)
                .NotEmpty().WithMessage("UserId is required");

            RuleFor(x => x.OrgId)
                .NotEmpty().WithMessage("OrgId is required");
        }
    }
}

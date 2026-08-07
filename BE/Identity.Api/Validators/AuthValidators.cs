using FluentValidation;
using Shared.Contracts.Requests;

namespace Identity.Api.Validators
{
    public class RegisterRequestValidator : AbstractValidator<RegisterRequestDto>
    {
        public RegisterRequestValidator()
        {
            RuleFor(x => x.Username)
                .NotEmpty().WithMessage("Username is required")
                .Length(3, 100).WithMessage("Username must be between 3 and 100 characters");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required")
                .EmailAddress().WithMessage("Email format is invalid")
                .MaximumLength(255).WithMessage("Email must not exceed 255 characters");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required")
                .MinimumLength(8).WithMessage("Password must be at least 8 characters")
                .Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter")
                .Matches(@"[a-z]").WithMessage("Password must contain at least one lowercase letter")
                .Matches(@"[0-9]").WithMessage("Password must contain at least one digit")
                .Matches(@"[!@#$%^&*]").WithMessage("Password must contain at least one special character (!@#$%^&*)");
        }
    }

    public class LoginRequestValidator : AbstractValidator<LoginRequestDto>
    {
        public LoginRequestValidator()
        {
            RuleFor(x => x.Username)
                .NotEmpty().WithMessage("Username is required");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required");
        }
    }

    public class CreateUserRequestValidator : AbstractValidator<CreateUserRequestDto>
    {
        private static readonly string[] AllowedRoles = { "Student", "Teacher", "OrgAdmin", "SysAdmin" };

        public CreateUserRequestValidator()
        {
            RuleFor(x => x.Username)
                .NotEmpty().WithMessage("Username is required")
                .Length(3, 100).WithMessage("Username must be between 3 and 100 characters");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required")
                .EmailAddress().WithMessage("Email format is invalid")
                .MaximumLength(255);

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required")
                .MinimumLength(8).WithMessage("Password must be at least 8 characters")
                .Matches(@"[A-Z]").Matches(@"[a-z]").Matches(@"[0-9]").Matches(@"[!@#$%^&*]")
                .WithMessage("Password must contain upper/lower/digit/special characters");

            RuleFor(x => x.Role)
                .Must(r => AllowedRoles.Contains(r))
                .WithMessage($"Role must be one of: {string.Join(", ", AllowedRoles)}");
        }
    }

    public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequestDto>
    {
        public ChangePasswordRequestValidator()
        {
            RuleFor(x => x.CurrentPassword)
                .NotEmpty().WithMessage("Current password is required");

            RuleFor(x => x.NewPassword)
                .NotEmpty().WithMessage("New password is required")
                .MinimumLength(8).WithMessage("Password must be at least 8 characters")
                .Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter")
                .Matches(@"[a-z]").WithMessage("Password must contain at least one lowercase letter")
                .Matches(@"[0-9]").WithMessage("Password must contain at least one digit")
                .Matches(@"[!@#$%^&*]").WithMessage("Password must contain at least one special character (!@#$%^&*)");
        }
    }

    public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequestDto>
    {
        public UpdateProfileRequestValidator()
        {
            When(x => x.Username != null, () =>
            {
                RuleFor(x => x.Username!)
                    .Length(3, 100).WithMessage("Username must be between 3 and 100 characters");
            });

            When(x => x.Email != null, () =>
            {
                RuleFor(x => x.Email!)
                    .NotEmpty().WithMessage("Email cannot be empty if provided")
                    .EmailAddress().WithMessage("Email format is invalid")
                    .MaximumLength(255);
            });
        }
    }

    public class UpdateLanguageRequestValidator : AbstractValidator<UpdateLanguageRequestDto>
    {
        // Spec 1 — supported languages: Vietnamese, Japanese, English.
        private static readonly string[] SupportedLanguages = { "vi", "ja", "en" };

        public UpdateLanguageRequestValidator()
        {
            RuleFor(x => x.Language)
                .NotEmpty().WithMessage("Language is required")
                .Must(l => SupportedLanguages.Contains(l))
                .WithMessage($"Language must be one of: {string.Join(", ", SupportedLanguages)}");
        }
    }
}

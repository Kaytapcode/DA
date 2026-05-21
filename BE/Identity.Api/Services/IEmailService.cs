namespace Identity.Api.Services
{
    public interface IEmailService
    {
        Task SendPasswordResetAsync(string toEmail, string username, string resetToken, CancellationToken ct = default);
    }

    /// <summary>
    /// Development email service — logs the reset token to console instead of sending email.
    /// In production, replace with an SMTP/SendGrid implementation.
    /// </summary>
    public class ConsoleEmailService : IEmailService
    {
        private readonly ILogger<ConsoleEmailService> _logger;

        public ConsoleEmailService(ILogger<ConsoleEmailService> logger)
        {
            _logger = logger;
        }

        public Task SendPasswordResetAsync(string toEmail, string username, string resetToken, CancellationToken ct = default)
        {
            _logger.LogInformation(
                "[DEV EMAIL] Password reset for {Username} ({Email}): token = {Token}",
                username, toEmail, resetToken);
            return Task.CompletedTask;
        }
    }
}

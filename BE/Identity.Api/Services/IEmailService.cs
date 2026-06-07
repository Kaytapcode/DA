using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Identity.Api.Services
{
    public interface IEmailService
    {
        /// <summary>True when a real SMTP transport is configured. When false, callers should
        /// surface the reset link to the user another way (e.g. return it on-screen in dev).</summary>
        bool IsConfigured { get; }

        Task SendPasswordResetAsync(string toEmail, string username, string resetLink, CancellationToken ct = default);
    }

    public class SmtpOptions
    {
        public string? Host { get; set; }
        public int Port { get; set; } = 587;
        public string? User { get; set; }
        public string? Password { get; set; }
        public string? From { get; set; }
        public string? FromName { get; set; } = "Lumina LMS";
        public bool UseStartTls { get; set; } = true;
    }

    /// <summary>
    /// Spec §1 — Forgot Password via secure email-bound reset tokens.
    /// Sends a real email through SMTP (MailKit) when configured. When SMTP is not configured,
    /// it logs the reset link and reports <see cref="IsConfigured"/> = false so the controller
    /// can return the link on-screen (dev/demo fallback).
    /// Configure under "Smtp" in appsettings / user-secrets / env:
    ///   Smtp:Host, Smtp:Port, Smtp:User, Smtp:Password, Smtp:From, Smtp:FromName
    /// </summary>
    public class SmtpEmailService : IEmailService
    {
        private readonly SmtpOptions _opts;
        private readonly ILogger<SmtpEmailService> _logger;

        public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
        {
            _opts = config.GetSection("Smtp").Get<SmtpOptions>() ?? new SmtpOptions();
            _logger = logger;
        }

        public bool IsConfigured =>
            !string.IsNullOrWhiteSpace(_opts.Host) &&
            !string.IsNullOrWhiteSpace(_opts.User) &&
            !string.IsNullOrWhiteSpace(_opts.Password);

        public async Task SendPasswordResetAsync(string toEmail, string username, string resetLink, CancellationToken ct = default)
        {
            if (!IsConfigured)
            {
                _logger.LogWarning(
                    "[EMAIL not configured] Password reset link for {Username} ({Email}): {Link}",
                    username, toEmail, resetLink);
                return;
            }

            var fromAddress = string.IsNullOrWhiteSpace(_opts.From) ? _opts.User! : _opts.From!;
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_opts.FromName ?? "Lumina LMS", fromAddress));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = "Lumina — Reset your password";
            message.Body = new BodyBuilder
            {
                HtmlBody = $@"
                    <div style=""font-family:Arial,sans-serif;max-width:480px;margin:auto"">
                        <h2>Reset your Lumina password</h2>
                        <p>Hi {System.Net.WebUtility.HtmlEncode(username)},</p>
                        <p>We received a request to reset your password. Click the button below to choose a new one.
                           This link expires in 30 minutes.</p>
                        <p style=""margin:24px 0"">
                            <a href=""{resetLink}"" style=""background:#4f46e5;color:#fff;padding:12px 24px;
                               border-radius:8px;text-decoration:none;display:inline-block"">Reset Password</a>
                        </p>
                        <p>Or paste this link into your browser:</p>
                        <p><a href=""{resetLink}"">{resetLink}</a></p>
                        <p style=""color:#888;font-size:12px"">If you didn't request this, you can safely ignore this email.</p>
                    </div>",
                TextBody = $"Reset your Lumina password (expires in 30 minutes): {resetLink}"
            }.ToMessageBody();

            try
            {
                using var client = new SmtpClient();
                var secure = _opts.UseStartTls ? SecureSocketOptions.StartTlsWhenAvailable : SecureSocketOptions.Auto;
                await client.ConnectAsync(_opts.Host, _opts.Port, secure, ct);
                await client.AuthenticateAsync(_opts.User, _opts.Password, ct);
                await client.SendAsync(message, ct);
                await client.DisconnectAsync(true, ct);
                _logger.LogInformation("Password reset email sent to {Email}", toEmail);
            }
            catch (Exception ex)
            {
                // Don't leak failure to the caller (email enumeration / UX), but log it loudly.
                _logger.LogError(ex, "Failed to send password reset email to {Email}", toEmail);
            }
        }
    }

    /// <summary>
    /// Development email service — logs the reset link to console instead of sending email.
    /// Kept for tests / explicitly opting out of SMTP.
    /// </summary>
    public class ConsoleEmailService : IEmailService
    {
        private readonly ILogger<ConsoleEmailService> _logger;

        public ConsoleEmailService(ILogger<ConsoleEmailService> logger)
        {
            _logger = logger;
        }

        public bool IsConfigured => false;

        public Task SendPasswordResetAsync(string toEmail, string username, string resetLink, CancellationToken ct = default)
        {
            _logger.LogInformation(
                "[DEV EMAIL] Password reset for {Username} ({Email}): link = {Link}",
                username, toEmail, resetLink);
            return Task.CompletedTask;
        }
    }
}

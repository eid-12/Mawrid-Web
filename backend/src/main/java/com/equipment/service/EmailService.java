package com.equipment.service;

import jakarta.mail.internet.MimeMessage;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${spring.mail.password:}")
    private String smtpApiKey;

    @PostConstruct
    void validateEmailConfiguration() {
        if (smtpApiKey == null || smtpApiKey.isBlank()) {
            throw new IllegalStateException(
                    "Missing MAIL_PASSWORD environment variable for Resend SMTP."
            );
        }
        log.info("Email sender configured as {}", fromEmail);
    }

    /**
     * Generic async email sender using named templates.
     * @param targetEmail Recipient address
     * @param subject Email subject
     * @param templateName One of: welcome, verification, password-reset, user-email-update, college-registration, college-email-update
     * @param model Template variables (e.g. userName, loginUrl, etc.)
     */
    @Async
    public void send(String targetEmail, String subject, String templateName, Map<String, Object> model) {
        String html = renderTemplate(templateName, model);
        sendHtml(targetEmail, subject, html);
    }

    private String renderTemplate(String templateName, Map<String, Object> model) {
        String title = String.valueOf(model.getOrDefault("title", "Mawrid"));
        String description = String.valueOf(model.getOrDefault("description", ""));
        String actionText = String.valueOf(model.getOrDefault("actionText", "Continue"));
        String actionUrl = String.valueOf(model.getOrDefault("actionUrl", frontendUrl + "/login"));
        return brandedTemplate(title, description, actionText, actionUrl);
    }

    /**
     * Welcome email for admin-created users (Flow A - Direct Invite).
     * No verification link - user can log in immediately.
     */
    @Async
    public void sendWelcomeEmail(String to, String userName, String temporaryPassword) {
        String loginUrl = frontendUrl + "/login";
        String description = """
            Hi %s,<br><br>
            Welcome to Mawrid! Your account has been created and activated by the System Administrator. You can log in now using your credentials.
            <br><br>
            <strong>Login email:</strong> %s
            <br>
            <strong>Password:</strong> %s
            <br><br>
            Please change your password after your first login for security.
            """.formatted(userName, to, temporaryPassword);
        String html = brandedTemplate(
                "Welcome to Mawrid System!",
                description,
                "Log in to Mawrid",
                loginUrl
        );
        sendHtml(to, "Welcome to Mawrid System!", html);
    }

    /**
     * User email update notification - sent to new email when Super Admin changes a user's email.
     */
    @Async
    public void sendUserEmailUpdateNotification(String to, String userName, String newEmail) {
        String loginUrl = frontendUrl + "/login";
        String description = """
            Hi %s,<br><br>
            Your Mawrid account email has been updated by the System Administrator.
            <br><br>
            <strong>New login email:</strong> %s
            <br><br>
            You can log in now using this email and your existing password.
            """.formatted(userName, newEmail);
        String html = brandedTemplate("Email Updated", description, "Log in to Mawrid", loginUrl);
        sendHtml(to, "Mawrid – Your account email has been updated", html);
    }

    /**
     * Official registration email when a new college is added with an email address.
     */
    @Async
    public void sendCollegeRegistrationEmail(String to, String collegeName, String collegeCode) {
        String description = """
            Your college <strong>%s</strong> (Code: %s) has been officially registered in the Mawrid Equipment Rental System.
            <br><br>
            You can now add college administrators and manage equipment through the Mawrid platform.
            """.formatted(collegeName, collegeCode);
        String html = brandedTemplate("College Registered", description, "Visit Mawrid", frontendUrl);
        sendHtml(to, "Mawrid – College officially registered", html);
    }

    /**
     * Confirmation email when a college's contact email is updated.
     */
    @Async
    public void sendCollegeEmailUpdateConfirmation(String to, String collegeName, String newEmail) {
        String description = """
            The contact email for <strong>%s</strong> has been updated to this address.
            <br><br>
            <strong>New contact email:</strong> %s
            <br><br>
            Official communications for this college will now be sent to this address.
            """.formatted(collegeName, newEmail);
        String html = brandedTemplate("Email Updated", description, "Visit Mawrid", frontendUrl);
        sendHtml(to, "Mawrid – College contact email updated", html);
    }

    /**
     * Verification email for public signup (Flow B - Self-Signup).
     * Contains link to verify email - user must click before logging in.
     */
    @Async
    public void sendVerificationEmail(String to, String token) {
        String verifyUrl = frontendUrl + "/verify-email?token=" + token;
        String html = brandedTemplate(
                "Verify your Mawrid account",
                "Welcome to Mawrid! Confirm your university account to start borrowing equipment.",
                "Verify Email",
                verifyUrl
        );
        sendHtml(to, "Verify your Mawrid account", html);
    }

    /**
     * OTP verification email for public signup - 6-digit code.
     * Subject: "Verify Your Mawrid Account".
     * <p>Use {@link #sendVerificationOtpEmailBlocking} from {@code @Transactional} services so SMTP runs
     * in the same thread and failures can be handled without marking the DB transaction rollback-only.</p>
     */
    @Async
    public void sendVerificationOtpEmail(String to, String otp) {
        sendVerificationOtpEmailBlocking(to, otp);
    }

    /**
     * Same as {@link #sendVerificationOtpEmail} but synchronous (safe to call inside a transaction).
     */
    public void sendVerificationOtpEmailBlocking(String to, String otp) {
        String description = """
            Welcome to Mawrid! Your verification code to activate your account is:
            <br><br>
            <strong style="font-size:24px;letter-spacing:4px;">%s</strong>
            <br><br>
            This code expires in 10 minutes. Do not share it with anyone.
            """.formatted(otp);
        String html = brandedTemplate("Verify Your Mawrid Account", description, "Go to Login", frontendUrl + "/login");
        sendHtml(to, "Verify Your Mawrid Account", html);
    }

    @Async
    public void sendPasswordResetEmail(String to, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        String html = brandedTemplate(
                "Reset your Mawrid password",
                "We received a password reset request for your Mawrid account. If this was you, continue below.",
                "Reset Password",
                resetUrl
        );
        sendHtml(to, "Reset your Mawrid password", html);
    }

    /**
     * OTP email for password reset (Step 1 – Send Code).
     */
    @Async
    public void sendOtpEmail(String to, String otp) {
        sendOtpEmailBlocking(to, otp);
    }

    public void sendOtpEmailBlocking(String to, String otp) {
        String description = """
            Your verification code for resetting your Mawrid password is:
            <br><br>
            <strong style="font-size:24px;letter-spacing:4px;">%s</strong>
            <br><br>
            This code expires in 5 minutes. Do not share it with anyone.
            """.formatted(otp);
        String html = brandedTemplate("Password Reset Code", description, "Go to Login", frontendUrl + "/login");
        sendHtml(to, "Mawrid – Your verification code", html);
    }

    /**
     * Temporary password email after successful OTP verification (Step 3).
     */
    @Async
    public void sendTemporaryPasswordEmail(String to, String userName, String temporaryPassword) {
        sendTemporaryPasswordEmailBlocking(to, userName, temporaryPassword);
    }

    public void sendTemporaryPasswordEmailBlocking(String to, String userName, String temporaryPassword) {
        String loginUrl = frontendUrl + "/login";
        String description = """
            Your password has been reset successfully.
            <br><br>
            <strong>Your temporary password:</strong> %s
            <br><br>
            Please log in and change your password immediately for security.
            """.formatted(temporaryPassword);
        String html = brandedTemplate("Password Reset Complete", description, "Log in to Mawrid", loginUrl);
        sendHtml(to, "Mawrid – Your password has been reset", html);
    }

    private void sendHtml(String to, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to send email", ex);
        }
    }

    private static String brandedTemplate(String title, String description, String actionText, String actionUrl) {
        return """
                <html>
                  <body style="margin:0;padding:0;background:#f5f9ff;font-family:Arial,sans-serif;color:#0f172a;">
                    <table width="100%%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
                      <tr>
                        <td align="center">
                          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:28px;">
                            <tr>
                              <td style="text-align:center;">
                                <div style="display:inline-block;width:44px;height:44px;line-height:44px;border-radius:12px;background:linear-gradient(135deg,#8CCDE6,#8393DE);color:#ffffff;font-weight:700;font-size:20px;">M</div>
                                <h2 style="margin:16px 0 8px 0;font-size:24px;">Mawrid</h2>
                                <h3 style="margin:0 0 12px 0;font-size:20px;color:#334155;">%s</h3>
                                <p style="margin:0 0 12px 0;font-size:14px;color:#334155;">Dear User,</p>
                                <p style="margin:0 0 24px 0;font-size:14px;color:#64748b;line-height:1.6;">%s</p>
                                <a href="%s" style="display:inline-block;padding:12px 20px;background:#8393DE;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">%s</a>
                                <p style="margin:20px 0 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">If the button does not work, copy and paste this link into your browser:<br/>%s</p>
                                <p style="margin:16px 0 0 0;font-size:12px;color:#64748b;">Regards,<br/>Mawrid Support Team</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(title, description, actionUrl, actionText, actionUrl);
    }
}

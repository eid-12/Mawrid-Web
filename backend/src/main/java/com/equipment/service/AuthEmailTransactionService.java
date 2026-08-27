package com.equipment.service;

import com.equipment.entity.User;
import com.equipment.entity.UserToken;
import com.equipment.exception.AccountInactiveException;
import com.equipment.exception.TooManyRequestsException;
import com.equipment.repository.UserRepository;
import com.equipment.repository.UserTokenRepository;
import com.equipment.util.CryptoUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Commits OTP rows and the 60s send slot before SMTP runs.
 * Concurrent forgot/resend calls wait on a row lock, then receive HTTP 429.
 */
@Service
@RequiredArgsConstructor
public class AuthEmailTransactionService {

    private static final long EMAIL_SEND_COOLDOWN_SECONDS = 60;
    static final String EMAIL_RATE_LIMIT_MESSAGE =
            "A verification code was already sent to your email. Please wait 60 seconds, then try again.";

    private final UserRepository userRepository;
    private final UserTokenRepository userTokenRepository;

    @Value("${app.reset.otp-ttl-seconds:300}")
    private long otpTtlSeconds;

    @Value("${app.verification.otp-ttl-seconds:600}")
    private long registrationOtpTtlSeconds;

    public record IssuedEmailOtp(String email, String otp) {
    }

    @Transactional
    public IssuedEmailOtp issueResendVerificationOtp(String email) {
        User user = userRepository.findByEmailForUpdate(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new IllegalArgumentException("Email already verified");
        }
        claimEmailSendSlot(user);
        userTokenRepository.deleteByUserIdAndTokenType(user.getId(), AuthService.TOKEN_TYPE_REGISTRATION_OTP);
        String otp = CryptoUtil.randomOtp6();
        userTokenRepository.save(UserToken.builder()
                .user(user)
                .tokenType(AuthService.TOKEN_TYPE_REGISTRATION_OTP)
                .tokenHash(CryptoUtil.sha256Hex(otp))
                .expiresAt(Instant.now().plusSeconds(registrationOtpTtlSeconds))
                .build());
        return new IssuedEmailOtp(user.getEmail(), otp);
    }

    @Transactional
    public IssuedEmailOtp issueForgotPasswordOtp(String email) {
        User user = userRepository.findByEmailForUpdate(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (Boolean.TRUE.equals(user.getEmailVerified()) && !Boolean.TRUE.equals(user.getIsActive())) {
            throw new AccountInactiveException();
        }
        claimEmailSendSlot(user);
        userTokenRepository.deleteByUserIdAndTokenType(user.getId(), AuthService.TOKEN_TYPE_PASSWORD_RESET_OTP);
        String otp = CryptoUtil.randomOtp6();
        userTokenRepository.save(UserToken.builder()
                .user(user)
                .tokenType(AuthService.TOKEN_TYPE_PASSWORD_RESET_OTP)
                .tokenHash(CryptoUtil.sha256Hex(otp))
                .expiresAt(Instant.now().plusSeconds(otpTtlSeconds))
                .build());
        return new IssuedEmailOtp(user.getEmail(), otp);
    }

    private void claimEmailSendSlot(User user) {
        Instant lastSentAt = user.getLastSentAt();
        if (lastSentAt != null && lastSentAt.plusSeconds(EMAIL_SEND_COOLDOWN_SECONDS).isAfter(Instant.now())) {
            throw new TooManyRequestsException(EMAIL_RATE_LIMIT_MESSAGE);
        }
        user.setLastSentAt(Instant.now());
        userRepository.saveAndFlush(user);
    }
}

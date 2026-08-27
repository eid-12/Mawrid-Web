package com.equipment.service;

import com.equipment.dto.auth.AuthDtos;
import com.equipment.entity.UserRole;
import com.equipment.entity.RefreshToken;
import com.equipment.entity.Tenant;
import com.equipment.entity.User;
import com.equipment.entity.UserToken;
import com.equipment.exception.AccountInactiveException;
import com.equipment.exception.CollegeDeactivatedException;
import com.equipment.exception.CollegeRemovedException;
import com.equipment.exception.EmailNotVerifiedException;
import com.equipment.repository.RefreshTokenRepository;
import com.equipment.repository.TenantRepository;
import com.equipment.repository.UserRepository;
import com.equipment.repository.UserTokenRepository;
import com.equipment.security.AppUserPrincipal;
import com.equipment.security.JwtService;
import com.equipment.util.CryptoUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    public static final String TOKEN_TYPE_EMAIL_VERIFY = "EMAIL_VERIFY";
    public static final String TOKEN_TYPE_PASSWORD_RESET = "PASSWORD_RESET";
    public static final String TOKEN_TYPE_PASSWORD_RESET_OTP = "PASSWORD_RESET_OTP";
    public static final String TOKEN_TYPE_REGISTRATION_OTP = "REGISTRATION_OTP";
    private static final String COLLEGE_REMOVED_MESSAGE =
            "Access Denied: Your college has been permanently removed from the system.";

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final UserTokenRepository userTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final UserRegistrationTransactionService userRegistrationTransactionService;
    private final AuthEmailTransactionService authEmailTransactionService;
    private final LegacyUserColumnSyncService legacyUserColumnSyncService;

    @Value("${app.refresh.ttl-seconds:2592000}") // 30 days
    private long refreshTtlSeconds;

    @Value("${app.verification.ttl-seconds:86400}") // 24h
    private long verificationTtlSeconds;

    @Value("${app.reset.ttl-seconds:3600}") // 1h
    private long resetTtlSeconds;

    @Transactional
    public AuthDtos.MeResponse me(AppUserPrincipal principal) {
        User u = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return AuthDtos.MeResponse.builder()
                .userId(u.getId())
                .tenantId(u.getTenant() != null ? u.getTenant().getId() : null)
                .tenantName(u.getTenant() != null ? u.getTenant().getName() : null)
                .tenantStatus(u.getTenant() != null ? u.getTenant().getStatus() : null)
                .role(u.getRole())
                .name(u.getName())
                .email(u.getEmail())
                .phone(u.getPhone())
                .emailVerified(u.getEmailVerified())
                .createdAt(u.getCreatedAt())
                .build();
    }

    /**
     * Public signup: DB work commits in a dedicated transactional service; email runs after commit so SMTP
     * and legacy SQL cannot mark the signup transaction rollback-only.
     */
    public void register(AuthDtos.RegisterRequest request) {
        UserRegistrationTransactionService.PendingSignup pending =
                userRegistrationTransactionService.createPendingSignup(request);
        try {
            emailService.sendVerificationOtpEmailBlocking(pending.email(), pending.plainOtp());
        } catch (RuntimeException ex) {
            log.warn("Registration verification email failed for {}: {}", pending.email(), ex.getMessage());
        }
    }

    @Transactional
    public void verifyRegistration(String email, String otpCode) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        String hash = CryptoUtil.sha256Hex(otpCode);
        UserToken token = userTokenRepository.findByUserIdAndTokenTypeAndTokenHash(user.getId(), TOKEN_TYPE_REGISTRATION_OTP, hash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired code"));
        if (token.getUsedAt() != null) {
            throw new IllegalArgumentException("This code has already been used");
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Code has expired");
        }
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(Instant.now());
        user.setIsActive(true);
        userRepository.save(user);
        token.setUsedAt(Instant.now());
        userTokenRepository.save(token);
    }

    @Transactional
    public AuthResult login(AuthDtos.LoginRequest request, HttpServletRequest httpRequest) {
        String rawPassword = (request.getPassword() != null ? request.getPassword() : "").trim();
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), rawPassword)
        );
        AppUserPrincipal principal = (AppUserPrincipal) auth.getPrincipal();

        User user = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (isCollegeRemovedAccount(user)) {
            throw new CollegeRemovedException(COLLEGE_REMOVED_MESSAGE);
        }
        user.setLastActiveAt(Instant.now());
        userRepository.save(user);

        boolean isSuperAdmin = UserRole.SUPER_ADMIN.equals(user.getRole());
        if (!isSuperAdmin && !Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new EmailNotVerifiedException();
        }
        if (!isSuperAdmin
                && UserRole.ADMIN.equals(user.getRole())
                && user.getTenant() != null
                && !"ACTIVE".equalsIgnoreCase(user.getTenant().getStatus())) {
            throw new CollegeDeactivatedException(
                    "Your college is currently deactivated."
            );
        }
        if (!isSuperAdmin && !Boolean.TRUE.equals(user.getIsActive())) {
            throw new AccountInactiveException();
        }

        String access = jwtService.issueAccessToken(principal);
        boolean rememberMe = Boolean.TRUE.equals(request.getRememberMe());
        RefreshIssued refresh = issueRefreshToken(user, httpRequest, rememberMe);

        AuthDtos.TokenResponse body = AuthDtos.TokenResponse.builder()
                .accessToken(access)
                .userId(user.getId())
                .tenantId(user.getTenant() != null ? user.getTenant().getId() : null)
                .tenantName(user.getTenant() != null ? user.getTenant().getName() : null)
                .tenantStatus(user.getTenant() != null ? user.getTenant().getStatus() : null)
                .role(user.getRole())
                .name(user.getName())
                .email(user.getEmail())
                .emailVerified(user.getEmailVerified())
                .build();

        return new AuthResult(body, refresh.rawToken(), rememberMe);
    }

    @Transactional
    public RefreshRotation refresh(String rawRefreshToken, HttpServletRequest httpRequest) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new IllegalArgumentException("Missing refresh token");
        }
        String hash = CryptoUtil.sha256Hex(rawRefreshToken);
        RefreshToken existing = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));
        if (existing.getRevokedAt() != null) {
            throw new IllegalArgumentException("Refresh token revoked");
        }
        if (existing.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Refresh token expired");
        }

        // Rotate: revoke old and issue new
        existing.setRevokedAt(Instant.now());
        User user = existing.getUser();
        user.setLastActiveAt(Instant.now());
        userRepository.save(user);
        boolean rememberMe = !Boolean.FALSE.equals(existing.getRememberMe());
        RefreshIssued next = issueRefreshToken(user, httpRequest, rememberMe);
        refreshTokenRepository.save(existing);

        // link chain (optional)
        RefreshToken nextEntity = refreshTokenRepository.findByTokenHash(CryptoUtil.sha256Hex(next.rawToken()))
                .orElse(null);
        if (nextEntity != null) {
            existing.setReplacedByToken(nextEntity);
            refreshTokenRepository.save(existing);
        }

        User refreshUser = existing.getUser();
        if (isCollegeRemovedAccount(refreshUser)) {
            throw new CollegeRemovedException(COLLEGE_REMOVED_MESSAGE);
        }
        boolean refreshSuperAdmin = UserRole.SUPER_ADMIN.equals(refreshUser.getRole());
        if (!refreshSuperAdmin
                && UserRole.ADMIN.equals(refreshUser.getRole())
                && refreshUser.getTenant() != null
                && !"ACTIVE".equalsIgnoreCase(refreshUser.getTenant().getStatus())) {
            throw new CollegeDeactivatedException(
                    "Your college is currently deactivated."
            );
        }

        AppUserPrincipal principal = new AppUserPrincipal(refreshUser);
        String access = jwtService.issueAccessToken(principal);
        return new RefreshRotation(access, next.rawToken(), rememberMe);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) return;
        String hash = CryptoUtil.sha256Hex(rawRefreshToken);
        refreshTokenRepository.findByTokenHash(hash).ifPresent(t -> {
            if (t.getRevokedAt() == null) {
                t.setRevokedAt(Instant.now());
                refreshTokenRepository.save(t);
            }
        });
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("Missing token");
        }
        String hash = CryptoUtil.sha256Hex(rawToken);
        UserToken token = userTokenRepository.findByTokenTypeAndTokenHash(TOKEN_TYPE_EMAIL_VERIFY, hash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid token"));
        if (token.getUsedAt() != null) {
            throw new IllegalArgumentException("Token already used");
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Token expired");
        }
        User user = token.getUser();
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(Instant.now());
        user.setIsActive(true);  // Activate account on successful verification
        userRepository.save(user);
        token.setUsedAt(Instant.now());
        userTokenRepository.save(token);
    }

    public void resendVerification(String email) {
        AuthEmailTransactionService.IssuedEmailOtp issued =
                authEmailTransactionService.issueResendVerificationOtp(email);
        try {
            emailService.sendVerificationOtpEmailBlocking(issued.email(), issued.otp());
        } catch (RuntimeException ex) {
            log.warn("Resend verification email failed for {}: {}", issued.email(), ex.getMessage());
        }
    }

    public void forgotPassword(String email) {
        AuthEmailTransactionService.IssuedEmailOtp issued =
                authEmailTransactionService.issueForgotPasswordOtp(email);
        emailService.sendOtpEmailBlocking(issued.email(), issued.otp());
    }

    @Transactional
    public void verifyOtpAndResetPassword(String email, String otp) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        String hash = CryptoUtil.sha256Hex(otp);
        UserToken token = userTokenRepository.findByUserIdAndTokenTypeAndTokenHash(user.getId(), TOKEN_TYPE_PASSWORD_RESET_OTP, hash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired code"));
        if (token.getUsedAt() != null) {
            throw new IllegalArgumentException("This code has already been used");
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Code has expired");
        }
        String tempPassword = CryptoUtil.randomPassword(10);
        emailService.sendTemporaryPasswordEmailBlocking(user.getEmail(), user.getName(), tempPassword);
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setPasswordChangedAt(Instant.now());
        userRepository.save(user);
        legacyUserColumnSyncService.syncAfterUserPersist(user);
        token.setUsedAt(Instant.now());
        userTokenRepository.save(token);
    }

    @Transactional
    public void updateProfile(AppUserPrincipal principal, AuthDtos.UpdateProfileRequest request) {
        User user = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (request.getName() != null) user.setName(request.getName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getTenantId() != null) {
            Tenant tenant = tenantRepository.findById(request.getTenantId())
                    .orElseThrow(() -> new IllegalArgumentException("College not found: " + request.getTenantId()));
            if (!"ACTIVE".equalsIgnoreCase(tenant.getStatus())) {
                throw new IllegalArgumentException("Selected college is not active.");
            }
            user.setTenant(tenant);
        }
        userRepository.save(user);
    }

    @Transactional
    public void changePassword(AppUserPrincipal principal, AuthDtos.ChangePasswordRequest request) {
        User user = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(Instant.now());
        userRepository.save(user);
        legacyUserColumnSyncService.syncAfterUserPersist(user);
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        String hash = CryptoUtil.sha256Hex(rawToken);
        UserToken token = userTokenRepository.findByTokenTypeAndTokenHash(TOKEN_TYPE_PASSWORD_RESET, hash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid token"));
        if (token.getUsedAt() != null) {
            throw new IllegalArgumentException("Token already used");
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Token expired");
        }
        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        legacyUserColumnSyncService.syncAfterUserPersist(user);
        token.setUsedAt(Instant.now());
        userTokenRepository.save(token);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTenantStatus(AppUserPrincipal principal) {
        User user = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Map<String, Object> payload = new HashMap<>();
        payload.put("tenantId", user.getTenant() != null ? user.getTenant().getId() : null);
        payload.put("status", user.getTenant() != null ? user.getTenant().getStatus() : null);
        return payload;
    }

    private static final long SESSION_REFRESH_TTL_SECONDS = 12 * 60 * 60;

    private RefreshIssued issueRefreshToken(User user, HttpServletRequest httpRequest, boolean rememberMe) {
        String raw = CryptoUtil.randomUrlToken(48);
        String hash = CryptoUtil.sha256Hex(raw);
        Instant now = Instant.now();
        long ttlSeconds = rememberMe ? refreshTtlSeconds : SESSION_REFRESH_TTL_SECONDS;
        RefreshToken token = RefreshToken.builder()
                .user(user)
                .tokenHash(hash)
                .issuedAt(now)
                .expiresAt(now.plus(Duration.ofSeconds(ttlSeconds)))
                .createdIp(getClientIp(httpRequest))
                .userAgent(httpRequest.getHeader("User-Agent"))
                .rememberMe(rememberMe)
                .build();
        refreshTokenRepository.save(token);
        return new RefreshIssued(raw);
    }

    private static String getClientIp(HttpServletRequest req) {
        String forwarded = req.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }

    private boolean isCollegeRemovedAccount(User user) {
        if (user == null) return false;
        if (UserRole.SUPER_ADMIN.equals(user.getRole())) return false;
        boolean detachedFromCollege = user.getTenant() == null;
        boolean inactive = !Boolean.TRUE.equals(user.getIsActive());
        return detachedFromCollege && inactive;
    }

    public record AuthResult(AuthDtos.TokenResponse body, String refreshToken, boolean rememberMe) {
    }

    public record RefreshRotation(String accessToken, String refreshToken, boolean rememberMe) {
    }

    private record RefreshIssued(String rawToken) {
    }
}


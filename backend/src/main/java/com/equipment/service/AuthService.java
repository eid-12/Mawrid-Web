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
import com.equipment.exception.TooManyRequestsException;
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
    private static final long EMAIL_SEND_COOLDOWN_SECONDS = 60;
    private static final String EMAIL_RATE_LIMIT_MESSAGE =
            "Please wait 60 seconds before requesting another email.";

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

    @Value("${app.refresh.ttl-seconds:2592000}") // 30 days
    private long refreshTtlSeconds;

    @Value("${app.verification.ttl-seconds:86400}") // 24h
    private long verificationTtlSeconds;

    @Value("${app.reset.ttl-seconds:3600}") // 1h
    private long resetTtlSeconds;

    @Value("${app.reset.otp-ttl-seconds:300}") // 5 min
    private long otpTtlSeconds;

    @Value("${app.verification.otp-ttl-seconds:600}") // 10 min for registration OTP
    private long registrationOtpTtlSeconds;

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

    @Transactional
    public void register(AuthDtos.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }
        String normalizedName = request.getName() != null ? request.getName().trim() : "";
        if (normalizedName.isBlank()) {
            throw new IllegalArgumentException("Full name is required");
        }
        if (normalizedName.length() > 60) {
            throw new IllegalArgumentException("Full name must be at most 60 characters");
        }
        String password = request.getPassword() != null ? request.getPassword() : "";
        boolean hasMinLength = password.length() >= 8;
        boolean hasUpperAndLower = password.matches(".*[a-z].*") && password.matches(".*[A-Z].*");
        boolean hasNumber = password.matches(".*\\d.*");
        boolean hasSpecial = password.matches(".*[^a-zA-Z\\d].*");
        if (!(hasMinLength && hasUpperAndLower && hasNumber && hasSpecial)) {
            throw new IllegalArgumentException("Password must satisfy all 4 requirements");
        }
        Tenant tenant = null;
        if (request.getTenantId() == null) {
            throw new IllegalArgumentException("College is required");
        }
        tenant = tenantRepository.findById(request.getTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + request.getTenantId()));
        if (!"ACTIVE".equals(tenant.getStatus())) {
            throw new IllegalArgumentException("Cannot register under a deactivated college. Please select an active college.");
        }

        // Flow B: Public Registration - OTP verification, account pending until verified
        User user = User.builder()
                .tenant(tenant)
                .role(request.getRole() == null ? UserRole.USER : request.getRole())
                .name(normalizedName)
                .email(request.getEmail())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(password))
                .isActive(false)
                .emailVerified(false)
                .build();
        user = userRepository.save(user);

        String otp = CryptoUtil.randomOtp6();
        String hash = CryptoUtil.sha256Hex(otp);
        UserToken t = UserToken.builder()
                .user(user)
                .tokenType(TOKEN_TYPE_REGISTRATION_OTP)
                .tokenHash(hash)
                .expiresAt(Instant.now().plusSeconds(registrationOtpTtlSeconds))
                .build();
        userTokenRepository.save(t);
        enforceEmailCooldown(user);
        emailService.sendVerificationOtpEmail(user.getEmail(), otp);
        markEmailSentNow(user);
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
        RefreshIssued refresh = issueRefreshToken(user, httpRequest);

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

        return new AuthResult(body, refresh.rawToken());
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
        RefreshIssued next = issueRefreshToken(user, httpRequest);
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
        return new RefreshRotation(access, next.rawToken());
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

    @Transactional
    public void resendVerification(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new IllegalArgumentException("Email already verified");
        }
        enforceEmailCooldown(user);
        userTokenRepository.deleteByUserIdAndTokenType(user.getId(), TOKEN_TYPE_REGISTRATION_OTP);
        String otp = CryptoUtil.randomOtp6();
        String hash = CryptoUtil.sha256Hex(otp);
        UserToken t = UserToken.builder()
                .user(user)
                .tokenType(TOKEN_TYPE_REGISTRATION_OTP)
                .tokenHash(hash)
                .expiresAt(Instant.now().plusSeconds(registrationOtpTtlSeconds))
                .build();
        userTokenRepository.save(t);
        emailService.sendVerificationOtpEmail(user.getEmail(), otp);
        markEmailSentNow(user);
    }

    @Transactional
    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        enforceEmailCooldown(user);
        user.setIsActive(true);
        userRepository.save(user);
        userTokenRepository.deleteByUserIdAndTokenType(user.getId(), TOKEN_TYPE_PASSWORD_RESET_OTP);
        String otp = CryptoUtil.randomOtp6();
        String hash = CryptoUtil.sha256Hex(otp);
        UserToken t = UserToken.builder()
                .user(user)
                .tokenType(TOKEN_TYPE_PASSWORD_RESET_OTP)
                .tokenHash(hash)
                .expiresAt(Instant.now().plusSeconds(otpTtlSeconds))
                .build();
        userTokenRepository.save(t);
        emailService.sendOtpEmail(user.getEmail(), otp);
        markEmailSentNow(user);
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
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setPasswordChangedAt(Instant.now());
        user.setIsActive(true);
        user.setEmailVerified(true);
        if (user.getEmailVerifiedAt() == null) {
            user.setEmailVerifiedAt(Instant.now());
        }
        userRepository.save(user);
        token.setUsedAt(Instant.now());
        userTokenRepository.save(token);
        try {
            emailService.sendTemporaryPasswordEmail(user.getEmail(), user.getName(), tempPassword);
        } catch (RuntimeException ex) {
            // Keep account activation/password reset persisted even if mail provider is temporarily unavailable.
            log.warn("Temporary password email failed for user {}: {}", user.getEmail(), ex.getMessage());
        }
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

    private RefreshIssued issueRefreshToken(User user, HttpServletRequest httpRequest) {
        String raw = CryptoUtil.randomUrlToken(48);
        String hash = CryptoUtil.sha256Hex(raw);
        Instant now = Instant.now();
        RefreshToken token = RefreshToken.builder()
                .user(user)
                .tokenHash(hash)
                .issuedAt(now)
                .expiresAt(now.plus(Duration.ofSeconds(refreshTtlSeconds)))
                .createdIp(getClientIp(httpRequest))
                .userAgent(httpRequest.getHeader("User-Agent"))
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

    private void enforceEmailCooldown(User user) {
        Instant lastSentAt = user.getLastSentAt();
        if (lastSentAt == null) return;
        Instant allowedAt = lastSentAt.plusSeconds(EMAIL_SEND_COOLDOWN_SECONDS);
        if (allowedAt.isAfter(Instant.now())) {
            throw new TooManyRequestsException(EMAIL_RATE_LIMIT_MESSAGE);
        }
    }

    private void markEmailSentNow(User user) {
        user.setLastSentAt(Instant.now());
        userRepository.save(user);
    }

    public record AuthResult(AuthDtos.TokenResponse body, String refreshToken) {
    }

    public record RefreshRotation(String accessToken, String refreshToken) {
    }

    private record RefreshIssued(String rawToken) {
    }
}


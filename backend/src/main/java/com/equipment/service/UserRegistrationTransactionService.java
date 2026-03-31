package com.equipment.service;

import com.equipment.dto.auth.AuthDtos;
import com.equipment.entity.Tenant;
import com.equipment.entity.User;
import com.equipment.entity.UserRole;
import com.equipment.entity.UserToken;
import com.equipment.repository.TenantRepository;
import com.equipment.repository.UserRepository;
import com.equipment.repository.UserTokenRepository;
import com.equipment.util.CryptoUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * DB-only part of public signup. Keeps the transaction short and free of SMTP / legacy-column surprises.
 */
@Service
@RequiredArgsConstructor
public class UserRegistrationTransactionService {

    private static final String TOKEN_TYPE_REGISTRATION_OTP = "REGISTRATION_OTP";

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final UserTokenRepository userTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final LegacyUserColumnSyncService legacyUserColumnSyncService;

    @Value("${app.verification.otp-ttl-seconds:600}")
    private long registrationOtpTtlSeconds;

    public record PendingSignup(String email, String plainOtp) {}

    @Transactional
    public PendingSignup createPendingSignup(AuthDtos.RegisterRequest request) {
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
        if (request.getTenantId() == null) {
            throw new IllegalArgumentException("College is required");
        }
        Tenant tenant = tenantRepository.findById(request.getTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + request.getTenantId()));
        if (!"ACTIVE".equals(tenant.getStatus())) {
            throw new IllegalArgumentException("Cannot register under a deactivated college. Please select an active college.");
        }

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
        legacyUserColumnSyncService.syncAfterUserPersist(user);

        String otp = CryptoUtil.randomOtp6();
        String hash = CryptoUtil.sha256Hex(otp);
        UserToken t = UserToken.builder()
                .user(user)
                .tokenType(TOKEN_TYPE_REGISTRATION_OTP)
                .tokenHash(hash)
                .expiresAt(Instant.now().plusSeconds(registrationOtpTtlSeconds))
                .build();
        userTokenRepository.save(t);

        return new PendingSignup(user.getEmail(), otp);
    }
}

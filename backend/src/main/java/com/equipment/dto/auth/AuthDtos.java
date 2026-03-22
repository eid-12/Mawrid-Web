package com.equipment.dto.auth;

import com.equipment.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.*;

import java.time.Instant;

public final class AuthDtos {

    private AuthDtos() {
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RegisterRequest {
        private Long tenantId; // nullable for SUPER_ADMIN-only accounts

        @NotNull
        private UserRole role; // USER, ADMIN, SUPER_ADMIN

        @NotBlank
        private String name;

        @Email
        @NotBlank
        private String email;

        @Pattern(regexp = "^$|^(05|5|(\\+9665)|(009665))[0-9]{8}$", message = "Please enter a valid Saudi phone number (e.g., 05xxxxxxxx)")
        private String phone;

        @NotBlank
        private String password;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LoginRequest {
        @Email
        @NotBlank
        private String email;
        @NotBlank
        private String password;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TokenResponse {
        private String accessToken;
        private Long userId;
        private Long tenantId;
        private String tenantName;
        private String tenantStatus;
        private UserRole role;
        private String name;
        private String email;
        private Boolean emailVerified;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MeResponse {
        private Long userId;
        private Long tenantId;
        private String tenantName;
        private String tenantStatus;
        private UserRole role;
        private String name;
        private String email;
        private String phone;
        private Boolean emailVerified;
        private Instant createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateProfileRequest {
        private String name;

        @Pattern(regexp = "^$|^(05|5|(\\+9665)|(009665))[0-9]{8}$", message = "Please enter a valid Saudi phone number (e.g., 05xxxxxxxx)")
        private String phone;

        private Long tenantId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChangePasswordRequest {
        @NotBlank
        private String currentPassword;
        @NotBlank
        private String newPassword;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RefreshRequest {
        private String refreshToken; // optional; fallback to cookie
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RefreshResponse {
        private String accessToken;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ForgotPasswordRequest {
        @Email
        @NotBlank
        private String email;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResetPasswordRequest {
        @NotBlank
        private String token;
        @NotBlank
        private String newPassword;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VerifyOtpRequest {
        @Email
        @NotBlank
        private String email;
        @NotBlank
        private String otp;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResendVerificationRequest {
        @Email
        @NotBlank
        private String email;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LogoutRequest {
        @NotNull
        private Boolean allDevices;
    }
}


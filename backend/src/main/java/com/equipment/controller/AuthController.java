package com.equipment.controller;

import com.equipment.dto.auth.AuthDtos;
import com.equipment.security.AppUserPrincipal;
import com.equipment.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.frontend.url}")
public class AuthController {

    private static final String REFRESH_COOKIE = "refresh_token";

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Registered. Verification email sent."
        ));
    }

    @GetMapping("/verify-email")
    public ResponseEntity<Map<String, Object>> verifyEmail(@RequestParam("token") String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(Map.of("message", "Email verified"));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, Object>> resendVerification(@Valid @RequestBody AuthDtos.ResendVerificationRequest request) {
        authService.resendVerification(request.getEmail());
        return ResponseEntity.ok(Map.of(
                "message", "Verification email re-sent"
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDtos.TokenResponse> login(
            @Valid @RequestBody AuthDtos.LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response
    ) {
        AuthService.AuthResult result = authService.login(request, httpRequest);
        setRefreshCookie(response, result.refreshToken());
        return ResponseEntity.ok(result.body());
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthDtos.RefreshResponse> refresh(
            @RequestBody(required = false) AuthDtos.RefreshRequest body,
            HttpServletRequest httpRequest,
            HttpServletResponse response
    ) {
        String raw = (body != null && body.getRefreshToken() != null && !body.getRefreshToken().isBlank())
                ? body.getRefreshToken()
                : readRefreshCookie(httpRequest);
        if (raw == null || raw.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
        }
        AuthService.RefreshRotation rotation = authService.refresh(raw, httpRequest);
        setRefreshCookie(response, rotation.refreshToken());
        return ResponseEntity.ok(AuthDtos.RefreshResponse.builder().accessToken(rotation.accessToken()).build());
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpServletRequest request, HttpServletResponse response) {
        String raw = readRefreshCookie(request);
        authService.logout(raw);
        clearRefreshCookie(response);
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthDtos.MeResponse> me(@AuthenticationPrincipal AppUserPrincipal principal) {
        return ResponseEntity.ok(authService.me(principal));
    }

    @GetMapping("/tenant-status")
    public ResponseEntity<Map<String, Object>> tenantStatus(@AuthenticationPrincipal AppUserPrincipal principal) {
        return ResponseEntity.ok(authService.getTenantStatus(principal));
    }

    @PutMapping("/me")
    public ResponseEntity<AuthDtos.MeResponse> updateProfile(
            @AuthenticationPrincipal AppUserPrincipal principal,
            @Valid @RequestBody AuthDtos.UpdateProfileRequest request) {
        authService.updateProfile(principal, request);
        return ResponseEntity.ok(authService.me(principal));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @AuthenticationPrincipal AppUserPrincipal principal,
            @Valid @RequestBody AuthDtos.ChangePasswordRequest request) {
        authService.changePassword(principal, request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@Valid @RequestBody AuthDtos.ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(Map.of(
                "message", "Verification code sent"
        ));
    }

    @PostMapping("/verify-registration")
    public ResponseEntity<Map<String, Object>> verifyRegistration(@Valid @RequestBody AuthDtos.VerifyOtpRequest request) {
        authService.verifyRegistration(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(Map.of("message", "Email verified successfully. You can now log in."));
    }

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<Map<String, Object>> verifyOtpAndResetPassword(@Valid @RequestBody AuthDtos.VerifyOtpRequest request) {
        authService.verifyOtpAndResetPassword(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(Map.of(
                "message", "Password reset complete. Check your email for your temporary password."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordRequest request) {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password reset"));
    }

    private static final int REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

    private static void setRefreshCookie(HttpServletResponse response, String rawToken) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, rawToken)
                .httpOnly(true)
                .secure(false)
                .path("/")
                .sameSite("Lax")
                .maxAge(Duration.ofSeconds(REFRESH_MAX_AGE_SECONDS))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private static void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .sameSite("Lax")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private static String readRefreshCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        return Arrays.stream(cookies)
                .filter(c -> REFRESH_COOKIE.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}


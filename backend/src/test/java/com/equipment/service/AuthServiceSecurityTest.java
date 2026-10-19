package com.equipment.service;

import com.equipment.exception.InvalidRefreshTokenException;
import com.equipment.dto.auth.AuthDtos;
import com.equipment.entity.User;
import com.equipment.entity.UserRole;
import com.equipment.repository.*;
import com.equipment.security.AppUserPrincipal;
import com.equipment.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.Optional;

class AuthServiceSecurityTest {
    @Test
    void missingRefreshTokenIsUnauthorizedSessionFailure() {
        AuthService service = new AuthService(
                mock(UserRepository.class),
                mock(UserTokenRepository.class),
                mock(RefreshTokenRepository.class),
                mock(PasswordEncoder.class),
                mock(AuthenticationManager.class),
                mock(JwtService.class),
                mock(EmailService.class),
                mock(UserRegistrationTransactionService.class),
                mock(AuthEmailTransactionService.class),
                mock(LegacyUserColumnSyncService.class)
        );

        assertThrows(InvalidRefreshTokenException.class, () -> service.refresh(" ", null));
    }

    @Test
    void changingPasswordInvalidatesEveryActiveRefreshToken() {
        UserRepository users = mock(UserRepository.class);
        RefreshTokenRepository refreshTokens = mock(RefreshTokenRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        LegacyUserColumnSyncService legacySync = mock(LegacyUserColumnSyncService.class);
        User user = User.builder().id(8L).email("user@example.test").name("User")
                .role(UserRole.USER).passwordHash("old-hash").isActive(true).build();
        when(users.findById(8L)).thenReturn(Optional.of(user));
        when(encoder.matches("Current!1", "old-hash")).thenReturn(true);
        when(encoder.encode("Replacement!2")).thenReturn("new-hash");
        AuthService service = new AuthService(users, mock(UserTokenRepository.class), refreshTokens,
                encoder, mock(AuthenticationManager.class), mock(JwtService.class), mock(EmailService.class),
                mock(UserRegistrationTransactionService.class), mock(AuthEmailTransactionService.class), legacySync);
        AuthDtos.ChangePasswordRequest request = new AuthDtos.ChangePasswordRequest();
        request.setCurrentPassword("Current!1");
        request.setNewPassword("Replacement!2");

        service.changePassword(new AppUserPrincipal(user), request);

        assertNotNull(user.getPasswordChangedAt());
        verify(refreshTokens).revokeAllActiveByUserId(eq(8L), any());
        verify(users).save(user);
        verify(legacySync).syncAfterUserPersist(user);
    }
}

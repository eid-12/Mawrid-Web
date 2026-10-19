package com.equipment.service;

import com.equipment.exception.InvalidRefreshTokenException;
import com.equipment.repository.*;
import com.equipment.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

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
}

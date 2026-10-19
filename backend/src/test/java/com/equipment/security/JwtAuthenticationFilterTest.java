package com.equipment.security;

import com.equipment.repository.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Date;
import java.time.Instant;

class JwtAuthenticationFilterTest {
    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void disabledAccountCannotUseAnExistingToken() throws Exception {
        assertAccountAccess(true);
    }

    @Test
    void enabledAccountCanUseAnExistingToken() throws Exception {
        assertAccountAccess(false);
    }

    @Test
    void tokenIssuedBeforePasswordChangeIsRejected() throws Exception {
        JwtService jwt = mock(JwtService.class);
        Claims claims = mock(Claims.class);
        when(jwt.parseClaims("old-token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn("test@example.com");
        when(claims.getIssuedAt()).thenReturn(Date.from(Instant.parse("2026-01-01T00:00:00Z")));
        UserRepository repository = mock(UserRepository.class);
        com.equipment.entity.User dbUser = com.equipment.entity.User.builder()
                .email("test@example.com")
                .passwordChangedAt(Instant.parse("2026-01-02T00:00:00Z"))
                .build();
        when(repository.findByEmail("test@example.com")).thenReturn(java.util.Optional.of(dbUser));
        UserDetailsService users = mock(UserDetailsService.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwt, users, repository);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer old-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertEquals(401, response.getStatus());
        verifyNoInteractions(chain, users);
    }

    private void assertAccountAccess(boolean disabled) throws Exception {
        JwtService jwt = mock(JwtService.class);
        Claims claims = mock(Claims.class);
        when(jwt.parseClaims("test-token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn("test@example.com");
        UserDetailsService users = mock(UserDetailsService.class);
        when(users.loadUserByUsername("test@example.com")).thenReturn(
                User.withUsername("test@example.com").password("unused")
                        .roles("ADMIN").disabled(disabled).build());
        UserRepository repository = mock(UserRepository.class);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwt, users, repository);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer test-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        if (disabled) {
            assertEquals(401, response.getStatus());
            assertNull(SecurityContextHolder.getContext().getAuthentication());
            verifyNoInteractions(chain);
        } else {
            assertNotNull(SecurityContextHolder.getContext().getAuthentication());
            verify(chain).doFilter(request, response);
        }
    }
}

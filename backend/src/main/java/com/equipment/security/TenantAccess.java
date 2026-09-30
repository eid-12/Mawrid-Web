package com.equipment.security;

import com.equipment.entity.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;

public final class TenantAccess {

    private TenantAccess() {
    }

    /** Current JWT principal, or throws if the request is anonymous. */
    public static AppUserPrincipal principal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AppUserPrincipal p)) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        return p;
    }

    public static void requireTenant(Long tenantId) {
        AppUserPrincipal p = principal();
        // Super-admin has no college; everyone else must match the path tenantId.
        if (hasRole(UserRole.SUPER_ADMIN)) return;
        if (p.getTenantId() == null || !p.getTenantId().equals(tenantId)) {
            throw new AccessDeniedException("Forbidden tenant access");
        }
    }

    public static void requireRole(UserRole role) {
        if (!hasRole(role)) {
            throw new AccessDeniedException("Forbidden");
        }
    }

    public static void requireRole(String role) {
        requireRole(parseRole(role));
    }

    public static boolean hasRole(UserRole role) {
        String expected = "ROLE_" + role.name();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a -> expected.equals(a.getAuthority()));
    }

    public static boolean hasRole(String role) {
        return hasRole(parseRole(role));
    }

    private static UserRole parseRole(String role) {
        if (role == null || role.isBlank()) {
            throw new AccessDeniedException("Forbidden");
        }
        String normalized = role.trim().toUpperCase();
        if ("SUPERADMIN".equals(normalized)) {
            return UserRole.SUPER_ADMIN;
        }
        try {
            return UserRole.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new AccessDeniedException("Forbidden");
        }
    }
}


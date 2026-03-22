package com.equipment.security;

import com.equipment.entity.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class TenantAccess {

    private TenantAccess() {
    }

    public static AppUserPrincipal principal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AppUserPrincipal p)) {
            throw new IllegalArgumentException("Unauthenticated");
        }
        return p;
    }

    public static void requireTenant(Long tenantId) {
        AppUserPrincipal p = principal();
        if (hasRole(UserRole.SUPER_ADMIN)) return;
        if (p.getTenantId() == null || !p.getTenantId().equals(tenantId)) {
            throw new IllegalArgumentException("Forbidden tenant access");
        }
    }

    public static void requireRole(UserRole role) {
        if (!hasRole(role)) {
            throw new IllegalArgumentException("Forbidden");
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
            throw new IllegalArgumentException("Role is required");
        }
        String normalized = role.trim().toUpperCase();
        if ("SUPERADMIN".equals(normalized)) {
            return UserRole.SUPER_ADMIN;
        }
        try {
            return UserRole.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Forbidden");
        }
    }
}


package com.equipment.security;

import com.equipment.entity.User;
import com.equipment.entity.UserRole;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class AppUserPrincipal implements UserDetails {

    private final Long userId;
    private final Long tenantId;
    private final String email;
    private final String passwordHash;
    private final boolean active;
    private final UserRole role;

    public AppUserPrincipal(User user) {
        this.userId = user.getId();
        this.tenantId = user.getTenant() != null ? user.getTenant().getId() : null;
        this.email = user.getEmail();
        this.passwordHash = user.getPasswordHash();
        this.active = Boolean.TRUE.equals(user.getIsActive());
        this.role = user.getRole();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        String normalized = (role == null ? UserRole.USER : role).name();
        return List.of(new SimpleGrantedAuthority("ROLE_" + normalized));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return UserRole.SUPER_ADMIN.equals(role) ? true : active;
    }
}


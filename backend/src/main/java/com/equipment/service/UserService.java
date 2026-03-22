package com.equipment.service;

import com.equipment.dto.auth.AuthDtos;
import com.equipment.entity.Tenant;
import jakarta.validation.constraints.Pattern;
import com.equipment.entity.User;
import com.equipment.entity.UserRole;
import com.equipment.repository.TenantRepository;
import com.equipment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private static final Sort DEFAULT_SORT = Sort.by(
            Sort.Order.desc("isActive"),
            Sort.Order.desc("createdAt")
    );

    public List<UserListDto> findAll(UserRole roleFilter) {
        List<User> users = roleFilter == null
                ? userRepository.findAll(DEFAULT_SORT)
                : userRepository.findByRole(roleFilter);
        return users.stream().map(this::toListDto).collect(Collectors.toList());
    }

    public Page<UserListDto> findAllPaginated(UserRole roleFilter, String query, Pageable pageable) {
        Sort sort = pageable.getSort().isSorted() ? pageable.getSort() : DEFAULT_SORT;
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        String normalizedQuery = (query == null || query.isBlank()) ? null : query.trim();
        Page<User> page = userRepository.search(roleFilter, normalizedQuery, sorted);
        return page.map(this::toListDto);
    }

    public Map<String, Long> getStats() {
        long total = userRepository.count();
        long collegeAdmins = userRepository.countByRole(UserRole.ADMIN);
        long superAdmins = userRepository.countByRole(UserRole.SUPER_ADMIN);
        long active = userRepository.countByIsActive(true);
        return Map.of("total", total, "collegeAdmins", collegeAdmins, "superAdmins", superAdmins, "active", active);
    }

    @Transactional
    public UserListDto createUser(AuthDtos.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }
        // ADMIN and USER must have a tenant; SUPER_ADMIN may have null
        boolean isSuperAdmin = UserRole.SUPER_ADMIN.equals(request.getRole());
        if (!isSuperAdmin && (request.getTenantId() == null || request.getTenantId() == 0)) {
            throw new IllegalArgumentException("College is required for Admin and User roles");
        }
        Tenant tenant = null;
        if (request.getTenantId() != null && request.getTenantId() != 0) {
            tenant = tenantRepository.findById(request.getTenantId())
                    .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + request.getTenantId()));
            if (!"ACTIVE".equals(tenant.getStatus())) {
                throw new IllegalArgumentException("Cannot assign user to an inactive college");
            }
        }
        User user = User.builder()
                .tenant(tenant)
                .role(request.getRole() == null ? UserRole.USER : request.getRole())
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .isActive(true)
                .emailVerified(true)
                .build();
        user.setEmailVerifiedAt(Instant.now());
        user = userRepository.save(user);

        // Send welcome email asynchronously
        emailService.sendWelcomeEmail(user.getEmail(), user.getName(), request.getPassword());

        return toListDto(user);
    }

    @Transactional
    public UserListDto updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
        String oldEmail = user.getEmail();
        if (request.getName() != null) user.setName(request.getName());
        if (request.getEmail() != null && !request.getEmail().trim().equals(oldEmail)) {
            if (userRepository.existsByEmail(request.getEmail().trim())) {
                throw new IllegalArgumentException("Email already in use");
            }
            user.setEmail(request.getEmail().trim());
        }
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getRole() != null) user.setRole(request.getRole());
        UserRole effectiveRole = user.getRole();
        if (request.getTenantId() != null) {
            if (request.getTenantId() == 0) {
                // System-wide only allowed for SUPER_ADMIN
                if (effectiveRole != UserRole.SUPER_ADMIN) {
                    throw new IllegalArgumentException("College is required for Admin and User roles");
                }
                user.setTenant(null);
            } else {
                Tenant t = tenantRepository.findById(request.getTenantId())
                        .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));
                if (!"ACTIVE".equals(t.getStatus())) {
                    throw new IllegalArgumentException("Cannot assign user to an inactive college");
                }
                user.setTenant(t);
            }
        }
        if (request.getIsActive() != null) user.setIsActive(request.getIsActive());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            user.setPasswordChangedAt(java.time.Instant.now());
        }
        user = userRepository.save(user);

        // On email update: send notification to new address
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()
                && !request.getEmail().trim().equals(oldEmail)) {
            emailService.sendUserEmailUpdateNotification(
                    user.getEmail(), user.getName(), user.getEmail());
        }
        return toListDto(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id))
            throw new IllegalArgumentException("User not found: " + id);
        userRepository.deleteById(id);
    }

    private UserListDto toListDto(User u) {
        return UserListDto.builder()
                .id(u.getId())
                .tenantId(u.getTenant() != null ? u.getTenant().getId() : null)
                .tenantName(u.getTenant() != null ? u.getTenant().getName() : "System")
                .role(u.getRole())
                .name(u.getName())
                .email(u.getEmail())
                .phone(u.getPhone())
                .active(Boolean.TRUE.equals(u.getIsActive()))
                .createdAt(u.getCreatedAt())
                .lastActiveAt(u.getLastActiveAt())
                .build();
    }

    @lombok.Data
    @lombok.Builder
    public static class UserListDto {
        private Long id;
        private Long tenantId;
        private String tenantName;
        private UserRole role;
        private String name;
        private String email;
        private String phone;
        private boolean active;
        private java.time.Instant createdAt;
        private java.time.Instant lastActiveAt;
    }

    @lombok.Data
    @lombok.Builder
    public static class UpdateUserRequest {
        private String name;
        private String email;

        @Pattern(regexp = "^$|^(05|5|(\\+9665)|(009665))[0-9]{8}$", message = "Please enter a valid Saudi phone number (e.g., 05xxxxxxxx)")
        private String phone;
        private UserRole role;
        private Long tenantId;
        private Boolean isActive;
        private String password;  // optional - only update if provided
    }
}

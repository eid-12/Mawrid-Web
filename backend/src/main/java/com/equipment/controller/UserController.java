package com.equipment.controller;

import com.equipment.dto.auth.AuthDtos;
import com.equipment.entity.User;
import com.equipment.entity.UserRole;
import com.equipment.repository.UserRepository;
import com.equipment.security.TenantAccess;
import com.equipment.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.frontend.url}")
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;

    @GetMapping("/users")
    public ResponseEntity<Page<UserService.UserListDto>> listAll(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        UserRole roleFilter = null;
        if (role != null && !role.isBlank()) {
            String r = role.toUpperCase().replace(" ", "_").replace("SUPERADMIN", "SUPER_ADMIN");
            try {
                roleFilter = UserRole.valueOf(r);
            } catch (IllegalArgumentException ignored) {}
        }
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(userService.findAllPaginated(roleFilter, q, pageable));
    }

    @GetMapping("/users/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        return ResponseEntity.ok(userService.getStats());
    }

    @PostMapping("/users")
    public ResponseEntity<UserService.UserListDto> createUser(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(request));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<UserService.UserListDto> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserService.UpdateUserRequest request) {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/tenants/{tenantId}/users")
    public ResponseEntity<List<UserSummary>> listByTenant(@PathVariable Long tenantId) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        List<UserSummary> users = userRepository.findByTenantId(tenantId).stream()
                .map(this::toSummary)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserSummary> getById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(u -> ResponseEntity.ok(toSummary(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    private UserSummary toSummary(User u) {
        UserSummary s = new UserSummary();
        s.setId(u.getId());
        s.setTenantId(u.getTenant() != null ? u.getTenant().getId() : null);
        s.setRole(u.getRole());
        s.setName(u.getName());
        s.setEmail(u.getEmail());
        s.setPhone(u.getPhone());
        s.setActive(u.getIsActive());
        s.setCreatedAt(u.getCreatedAt());
        return s;
    }

    @lombok.Getter
    @lombok.Setter
    public static class UserSummary {
        private Long id;
        private Long tenantId;
        private UserRole role;
        private String name;
        private String email;
        private String phone;
        private Boolean active;
        private java.time.Instant createdAt;
    }
}

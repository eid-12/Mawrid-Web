package com.equipment.controller;

import com.equipment.dto.CreateTenantRequest;
import com.equipment.dto.TenantDto;
import com.equipment.dto.TenantSettingsDto;
import com.equipment.entity.UserRole;
import com.equipment.security.TenantAccess;
import com.equipment.service.TenantService;
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

@RestController
@RequestMapping("/api/tenants")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.frontend.url}")
public class TenantController {

    private final TenantService tenantService;

    @PostMapping
    public ResponseEntity<TenantDto> register(@Valid @RequestBody CreateTenantRequest request) {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        TenantDto created = tenantService.registerTenant(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<Page<TenantDto>> list(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(tenantService.findAllPaginated(pageable, q));
    }

    @GetMapping("/list-all")
    public ResponseEntity<List<TenantDto>> listAll() {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        return ResponseEntity.ok(tenantService.findAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<TenantDto>> listActive() {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        return ResponseEntity.ok(tenantService.findAllActive());
    }

    /** Public endpoint for signup page - lists active colleges only. No auth required. */
    @GetMapping("/public/active")
    public ResponseEntity<List<TenantDto>> listActivePublic() {
        return ResponseEntity.ok(tenantService.findAllActive());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        return ResponseEntity.ok(tenantService.getStats());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TenantDto> getById(@PathVariable Long id) {
        TenantAccess.requireTenant(id);
        return ResponseEntity.ok(tenantService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TenantDto> update(@PathVariable Long id, @Valid @RequestBody CreateTenantRequest request) {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        return ResponseEntity.ok(tenantService.updateTenant(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        tenantService.deleteTenant(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{tenantId}/settings")
    public ResponseEntity<TenantSettingsDto> getSettings(@PathVariable Long tenantId) {
        TenantAccess.requireTenant(tenantId);
        TenantSettingsDto settings = tenantService.getSettings(tenantId);
        return settings != null ? ResponseEntity.ok(settings) : ResponseEntity.notFound().build();
    }

    @PutMapping("/{tenantId}/settings")
    public ResponseEntity<TenantSettingsDto> updateSettings(
            @PathVariable Long tenantId,
            @RequestBody TenantSettingsDto dto) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        return ResponseEntity.ok(tenantService.updateSettings(tenantId, dto));
    }
}

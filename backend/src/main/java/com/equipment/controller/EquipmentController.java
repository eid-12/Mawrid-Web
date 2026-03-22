package com.equipment.controller;

import com.equipment.dto.CreateEquipmentRequest;
import com.equipment.dto.CreateEquipmentUnitRequest;
import com.equipment.dto.EquipmentDto;
import com.equipment.dto.EquipmentUnitDto;
import com.equipment.entity.UserRole;
import com.equipment.security.AppUserPrincipal;
import com.equipment.security.TenantAccess;
import com.equipment.service.EquipmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.frontend.url}")
public class EquipmentController {

    private final EquipmentService equipmentService;

    // --- Equipment ---
    @PostMapping("/tenants/{tenantId}/equipment")
    public ResponseEntity<EquipmentDto> createEquipment(
            @PathVariable Long tenantId,
            @Valid @RequestBody CreateEquipmentRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        request.setTenantId(tenantId);
        if (request.getCreatedByAdminId() == null && principal != null) {
            request.setCreatedByAdminId(principal.getUserId());
        }
        EquipmentDto created = equipmentService.createEquipment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * User catalog: equipment from user's college first, then other colleges.
     * Requires USER, ADMIN, or SUPER_ADMIN.
     */
    @GetMapping("/catalog/equipment")
    public ResponseEntity<List<EquipmentDto>> listCatalog(
            @AuthenticationPrincipal AppUserPrincipal principal
    ) {
        Long userTenantId = principal != null ? principal.getTenantId() : null;
        Long userId = principal != null ? principal.getUserId() : null;
        return ResponseEntity.ok(equipmentService.getCatalogForUser(userId, userTenantId));
    }

    @GetMapping("/tenants/{tenantId}/equipment")
    public ResponseEntity<List<EquipmentDto>> listEquipment(@PathVariable Long tenantId) {
        TenantAccess.requireTenant(tenantId);
        return ResponseEntity.ok(equipmentService.getEquipmentByTenant(tenantId));
    }

    @GetMapping("/equipment/{id}")
    public ResponseEntity<EquipmentDto> getEquipment(@PathVariable Long id) {
        EquipmentDto eq = equipmentService.getEquipmentById(id);
        if (eq.getTenantId() != null) TenantAccess.requireTenant(eq.getTenantId());
        return ResponseEntity.ok(eq);
    }

    @PutMapping("/equipment/{id}")
    public ResponseEntity<EquipmentDto> updateEquipment(
            @PathVariable Long id,
            @RequestBody CreateEquipmentRequest request,
            @AuthenticationPrincipal AppUserPrincipal principal) {
        TenantAccess.requireRole(UserRole.ADMIN);
        EquipmentDto existing = equipmentService.getEquipmentById(id);
        if (existing.getTenantId() != null) {
            TenantAccess.requireTenant(existing.getTenantId());
            request.setTenantId(existing.getTenantId());
        }
        if (request.getCreatedByAdminId() == null && principal != null) {
            request.setCreatedByAdminId(principal.getUserId());
        }
        return ResponseEntity.ok(equipmentService.updateEquipment(id, request));
    }

    @DeleteMapping("/equipment/{id}")
    public ResponseEntity<Void> deleteEquipment(
            @PathVariable Long id,
            @AuthenticationPrincipal AppUserPrincipal principal) {
        TenantAccess.requireRole(UserRole.ADMIN);
        EquipmentDto existing = equipmentService.getEquipmentById(id);
        if (existing.getTenantId() != null) TenantAccess.requireTenant(existing.getTenantId());
        equipmentService.deleteEquipment(id, principal != null ? principal.getUserId() : null);
        return ResponseEntity.noContent().build();
    }

    // --- Equipment Units ---
    @PostMapping("/equipment-units")
    public ResponseEntity<EquipmentUnitDto> createUnit(@Valid @RequestBody CreateEquipmentUnitRequest request) {
        TenantAccess.requireTenant(request.getTenantId());
        TenantAccess.requireRole(UserRole.ADMIN);
        EquipmentUnitDto created = equipmentService.createUnit(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/tenants/{tenantId}/equipment-units")
    public ResponseEntity<List<EquipmentUnitDto>> listUnitsByTenant(@PathVariable Long tenantId) {
        TenantAccess.requireTenant(tenantId);
        return ResponseEntity.ok(equipmentService.getUnitsByTenant(tenantId));
    }

    @GetMapping("/equipment/{equipmentId}/units")
    public ResponseEntity<List<EquipmentUnitDto>> listUnitsByEquipment(@PathVariable Long equipmentId) {
        return ResponseEntity.ok(equipmentService.getUnitsByEquipment(equipmentId));
    }

    @GetMapping("/equipment-units/{id}")
    public ResponseEntity<EquipmentUnitDto> getUnit(@PathVariable Long id) {
        return ResponseEntity.ok(equipmentService.getUnitById(id));
    }

    @PutMapping("/equipment-units/{id}")
    public ResponseEntity<EquipmentUnitDto> updateUnit(
            @PathVariable Long id,
            @Valid @RequestBody CreateEquipmentUnitRequest request) {
        TenantAccess.requireRole(UserRole.ADMIN);
        return ResponseEntity.ok(equipmentService.updateUnit(id, request));
    }

    @DeleteMapping("/equipment-units/{id}")
    public ResponseEntity<Void> deleteUnit(@PathVariable Long id) {
        TenantAccess.requireRole(UserRole.ADMIN);
        equipmentService.deleteUnit(id);
        return ResponseEntity.noContent().build();
    }
}

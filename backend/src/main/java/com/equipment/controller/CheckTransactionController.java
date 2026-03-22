package com.equipment.controller;

import com.equipment.dto.*;
import com.equipment.entity.UserRole;
import com.equipment.security.AppUserPrincipal;
import com.equipment.security.TenantAccess;
import com.equipment.service.CheckTransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tenants/{tenantId}/check-transactions")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.frontend.url}")
public class CheckTransactionController {

    private final CheckTransactionService checkTransactionService;

    @PostMapping
    public ResponseEntity<CheckTransactionDto> create(
            @PathVariable Long tenantId,
            @Valid @RequestBody CreateCheckTransactionRequest request) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        if (request.getAdminId() == null) {
            request.setAdminId(TenantAccess.principal().getUserId());
        }
        CheckTransactionDto created = checkTransactionService.create(tenantId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<List<CheckTransactionDto>> listByTenant(@PathVariable Long tenantId) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        return ResponseEntity.ok(checkTransactionService.getByTenantId(tenantId));
    }

    @GetMapping("/pending-checkouts")
    public ResponseEntity<PendingCheckPageDto> getPendingCheckouts(
            @PathVariable Long tenantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        return ResponseEntity.ok(checkTransactionService.getPendingCheckouts(tenantId, page, size));
    }

    @GetMapping("/pending-returns")
    public ResponseEntity<PendingCheckPageDto> getPendingReturns(
            @PathVariable Long tenantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        return ResponseEntity.ok(checkTransactionService.getPendingReturns(tenantId, page, size));
    }

    @GetMapping("/requests/{requestId}/available-units")
    public ResponseEntity<List<EquipmentUnitDto>> getAvailableUnitsForRequest(
            @PathVariable Long tenantId,
            @PathVariable Long requestId) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        return ResponseEntity.ok(checkTransactionService.getAvailableUnitsForRequest(tenantId, requestId));
    }

    @PostMapping("/scan")
    public ResponseEntity<ScanResultDto> scan(
            @PathVariable Long tenantId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal AppUserPrincipal principal) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        String serialNo = body != null ? body.get("serialNo") : null;
        ScanResultDto result = checkTransactionService.scan(tenantId, serialNo, principal != null ? principal.getUserId() : null);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/by-request/{requestId}")
    public ResponseEntity<List<CheckTransactionDto>> listByRequest(
            @PathVariable Long tenantId,
            @PathVariable Long requestId) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        return ResponseEntity.ok(checkTransactionService.getByRequestId(requestId));
    }
}

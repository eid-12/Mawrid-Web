package com.equipment.controller;

import com.equipment.dto.BorrowRequestDto;
import com.equipment.dto.BorrowRequestPageDto;
import com.equipment.dto.CreateBorrowRequestDto;
import com.equipment.dto.DecisionRequestDto;
import com.equipment.entity.UserRole;
import com.equipment.security.TenantAccess;
import com.equipment.service.BorrowRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/tenants/{tenantId}/borrow-requests")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.frontend.url}")
public class BorrowRequestController {

    private final BorrowRequestService borrowRequestService;

    @PostMapping
    public ResponseEntity<BorrowRequestDto> create(
            @PathVariable Long tenantId,
            @Valid @RequestBody CreateBorrowRequestDto dto) {
        TenantAccess.requireTenant(tenantId);
        BorrowRequestDto created = borrowRequestService.createRequest(tenantId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<List<BorrowRequestDto>> listByTenant(@PathVariable Long tenantId) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        return ResponseEntity.ok(borrowRequestService.getByTenant(tenantId));
    }

    @GetMapping("/search")
    public ResponseEntity<BorrowRequestPageDto> searchByTenant(
            @PathVariable Long tenantId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String statuses,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "7") int size
    ) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        List<String> parsedStatuses = (statuses == null || statuses.isBlank())
                ? List.of()
                : Arrays.stream(statuses.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
        return ResponseEntity.ok(
                borrowRequestService.searchByTenant(tenantId, q, parsedStatuses, page, size)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<BorrowRequestDto> getById(@PathVariable Long tenantId, @PathVariable Long id) {
        TenantAccess.requireTenant(tenantId);
        BorrowRequestDto dto = borrowRequestService.getById(id);
        if (dto.getTenantId() != null && !dto.getTenantId().equals(tenantId)) {
            throw new IllegalArgumentException("Request not found");
        }
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{requestId}/approve")
    public ResponseEntity<BorrowRequestDto> approve(
            @PathVariable Long tenantId,
            @PathVariable Long requestId,
            @RequestBody(required = false) DecisionRequestDto dto) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        if (dto == null) dto = new DecisionRequestDto();
        return ResponseEntity.ok(borrowRequestService.approve(requestId, dto));
    }

    @PostMapping("/{requestId}/reject")
    public ResponseEntity<BorrowRequestDto> reject(
            @PathVariable Long tenantId,
            @PathVariable Long requestId,
            @RequestBody(required = false) DecisionRequestDto dto) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        if (dto == null) dto = new DecisionRequestDto();
        return ResponseEntity.ok(borrowRequestService.reject(requestId, dto));
    }
}

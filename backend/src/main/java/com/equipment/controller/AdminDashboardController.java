package com.equipment.controller;

import com.equipment.entity.UserRole;
import com.equipment.security.TenantAccess;
import com.equipment.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tenants/{tenantId}/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.frontend.url}")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/stats")
    public ResponseEntity<AdminDashboardService.AdminDashboardStats> getStats(@PathVariable Long tenantId) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        return ResponseEntity.ok(adminDashboardService.getStats(tenantId));
    }

    @GetMapping("/recent-activity")
    public ResponseEntity<List<AdminDashboardService.AdminRecentActivityItem>> getRecentActivity(
            @PathVariable Long tenantId,
            @RequestParam(defaultValue = "10") int limit) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        return ResponseEntity.ok(adminDashboardService.getRecentActivity(tenantId, limit));
    }

    @GetMapping("/alerts")
    public ResponseEntity<AdminDashboardService.AdminAlertResponse> getAlerts(@PathVariable Long tenantId) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        return ResponseEntity.ok(adminDashboardService.getAlerts(tenantId));
    }

    @PostMapping("/alerts/dismiss")
    public ResponseEntity<Void> dismissAlert(
            @PathVariable Long tenantId,
            @RequestBody DismissAlertRequest request
    ) {
        TenantAccess.requireTenant(tenantId);
        TenantAccess.requireRole(UserRole.ADMIN);
        adminDashboardService.dismissAlert(tenantId, request.alertKey());
        return ResponseEntity.noContent().build();
    }

    public record DismissAlertRequest(String alertKey) {}
}

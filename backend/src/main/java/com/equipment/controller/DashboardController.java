package com.equipment.controller;

import com.equipment.entity.UserRole;
import com.equipment.security.TenantAccess;
import com.equipment.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.frontend.url}")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<DashboardService.DashboardStats> getStats() {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        return ResponseEntity.ok(dashboardService.getStats());
    }

    @GetMapping("/college-stats")
    public ResponseEntity<List<DashboardService.CollegeStatRow>> getCollegeStats() {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        return ResponseEntity.ok(dashboardService.getCollegeStats());
    }

    @GetMapping("/recent-activity")
    public ResponseEntity<List<DashboardService.RecentActivityItem>> getRecentActivity(
            @RequestParam(defaultValue = "5") int limit) {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        return ResponseEntity.ok(dashboardService.getRecentActivity(limit));
    }

    @GetMapping("/system-health")
    public ResponseEntity<DashboardService.SystemHealth> getSystemHealth() {
        TenantAccess.requireRole(UserRole.SUPER_ADMIN);
        return ResponseEntity.ok(dashboardService.getSystemHealth());
    }
}

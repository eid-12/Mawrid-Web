package com.equipment.service;

import com.equipment.entity.BorrowRequest;
import com.equipment.entity.EquipmentUnit;
import com.equipment.entity.User;
import com.equipment.entity.UserRole;
import com.equipment.repository.BorrowRequestRepository;
import com.equipment.repository.EquipmentRepository;
import com.equipment.repository.EquipmentUnitRepository;
import com.equipment.repository.TenantRepository;
import com.equipment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final EquipmentRepository equipmentRepository;
    private final EquipmentUnitRepository equipmentUnitRepository;
    private final BorrowRequestRepository borrowRequestRepository;

    public DashboardStats getStats() {
        // Active entities only
        long totalColleges = tenantRepository.countByStatus("ACTIVE");
        long totalUsers = userRepository.countByIsActive(true);
        long totalEquipment = equipmentUnitRepository.countByTenantStatusActive();
        long totalRequests = borrowRequestRepository.countByTenantStatusActive();

        int utilization = (totalEquipment > 0)
                ? (int) Math.min(100, Math.round(100.0 * totalRequests / totalEquipment))
                : 0;

        return DashboardStats.builder()
                .totalColleges(totalColleges)
                .totalUsers(totalUsers)
                .totalEquipment(totalEquipment)
                .totalRequests(totalRequests)
                .activeUsers((int) totalUsers)
                .systemUtilizationPercent(utilization)
                .build();
    }

    public List<CollegeStatRow> getCollegeStats() {
        return tenantRepository.findByStatusOrderByNameAsc("ACTIVE").stream()
                .map(t -> {
                    int users = (int) userRepository.findByTenantId(t.getId()).stream()
                            .filter(u -> Boolean.TRUE.equals(u.getIsActive()))
                            .count();
                    int equipment = equipmentUnitRepository.findByTenantId(t.getId()).size();
                    int requests = borrowRequestRepository.findByTenantId(t.getId()).size();
                    return new CollegeStatRow(t.getName(), users, equipment, requests);
                })
                .collect(Collectors.toList());
    }

    public List<RecentActivityItem> getRecentActivity(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 5));
        List<RecentActivityItem> items = new ArrayList<>();

        List<BorrowRequest> recentRequests = borrowRequestRepository.findRecentForActiveTenants(
                PageRequest.of(0, safeLimit)
        );

        for (BorrowRequest r : recentRequests) {
            String action = "PENDING".equals(r.getStatus()) ? "New borrow request" :
                    "APPROVED".equals(r.getStatus()) ? "Request approved" :
                            "REJECTED".equals(r.getStatus()) ? "Request rejected" : "Request updated";
            items.add(new RecentActivityItem(
                    r.getId(),
                    r.getTenant().getName(),
                    action,
                    r.getEquipment().getName() + " requested",
                    formatTimeAgo(r.getCreatedAt())
            ));
        }

        return items.stream().limit(safeLimit).toList();
    }

    public SystemHealth getSystemHealth() {
        return SystemHealth.builder()
                .averageResponseTimePercent(95)
                .averageResponseTimeLabel("Excellent")
                .databasePerformancePercent(88)
                .databasePerformanceLabel("Good")
                .apiUptimePercent(99.9)
                .build();
    }

    private static String formatTimeAgo(java.time.Instant instant) {
        long sec = java.time.Duration.between(instant, java.time.Instant.now()).getSeconds();
        if (sec < 60) return "Just now";
        if (sec < 3600) return (sec / 60) + " minutes ago";
        if (sec < 86400) return (sec / 3600) + " hours ago";
        if (sec < 604800) return (sec / 86400) + " days ago";
        return (sec / 604800) + " weeks ago";
    }

    @lombok.Data
    @lombok.Builder
    public static class DashboardStats {
        private long totalColleges;
        private long totalUsers;
        private long totalEquipment;
        private long totalRequests;
        private long activeUsers;
        private int systemUtilizationPercent;
    }

    public record CollegeStatRow(String name, int users, int equipment, int requests) {}

    public record RecentActivityItem(long id, String college, String action, String details, String time) {}

    @lombok.Data
    @lombok.Builder
    public static class SystemHealth {
        private int averageResponseTimePercent;
        private String averageResponseTimeLabel;
        private int databasePerformancePercent;
        private String databasePerformanceLabel;
        private double apiUptimePercent;
    }
}

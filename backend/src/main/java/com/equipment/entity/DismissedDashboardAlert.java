package com.equipment.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
        name = "dismissed_dashboard_alerts",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_dismissed_alert_tenant_key", columnNames = {"tenant_id", "alert_key"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DismissedDashboardAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "alert_key", nullable = false, length = 255)
    private String alertKey;

    @Column(name = "dismissed_at", nullable = false)
    private Instant dismissedAt;

    @PrePersist
    protected void onCreate() {
        if (dismissedAt == null) dismissedAt = Instant.now();
    }
}

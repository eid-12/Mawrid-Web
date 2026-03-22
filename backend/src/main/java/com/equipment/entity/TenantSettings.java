package com.equipment.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;
import java.time.Instant;

@Entity
@Table(name = "tenant_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantSettings {

    @Id
    @Column(name = "tenant_id")
    private Long tenantId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "tenant_id")
    private Tenant tenant;

    @Column(name = "max_borrow_days")
    private Integer maxBorrowDays;

    @Column(name = "approval_required")
    private Boolean approvalRequired;

    @Column(name = "cutoff_time")
    private LocalTime cutoffTime;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PreUpdate
    @PrePersist
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}

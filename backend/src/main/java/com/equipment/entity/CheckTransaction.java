package com.equipment.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "check_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private BorrowRequest request;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_unit_id", nullable = false)
    private EquipmentUnit equipmentUnit;

    @Column(nullable = false)
    private String action;

    @Column(name = "admin_id")
    private Long adminId;

    @Column(name = "action_at", nullable = false)
    private Instant actionAt;

    @Column(columnDefinition = "TEXT")
    private String notes;
}

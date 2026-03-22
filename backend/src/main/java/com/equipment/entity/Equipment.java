package com.equipment.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "equipment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Equipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(nullable = false)
    @NotBlank(message = "This field is required")
    private String name;

    @NotBlank(message = "This field is required")
    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "total_quantity", nullable = false)
    @NotNull(message = "This field is required")
    private Integer totalQuantity;

    @Column(name = "available_quantity", nullable = false)
    private Integer availableQuantity;

    @Column(name = "available_from")
    @NotNull(message = "This field is required")
    private LocalDate availableFrom;

    @Column(name = "available_to")
    @NotNull(message = "This field is required")
    private LocalDate availableTo;

    @Column(name = "max_borrow_days")
    private Integer maxBorrowDays;

    @Column(name = "created_by_admin_id")
    private Long createdByAdminId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @OneToMany(mappedBy = "equipment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<EquipmentUnit> equipmentUnits = new ArrayList<>();

    @OneToMany(mappedBy = "equipment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BorrowRequest> borrowRequests = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (maxBorrowDays == null || maxBorrowDays < 1) maxBorrowDays = 7;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
        if (maxBorrowDays == null || maxBorrowDays < 1) maxBorrowDays = 7;
    }
}

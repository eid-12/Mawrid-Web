package com.equipment.dto;

import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentDto {
    private Long id;
    private Long tenantId;
    private String tenantName;
    private String name;
    private String category;
    private String description;
    private Integer totalQuantity;
    private Integer availableQuantity;
    private String status; // AVAILABLE, BORROWED, MAINTENANCE, RETIRED
    private LocalDate availableFrom;
    private LocalDate availableTo;
    private Integer maxBorrowDays;
    private String maintenanceNotes;
    private Boolean mergedIntoExisting;
    private Double relevanceScore;
    private Boolean recommended;
    private Long createdByAdminId;
    private Instant createdAt;
    private Instant updatedAt;
}

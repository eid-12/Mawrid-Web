package com.equipment.dto;

import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BorrowRequestDto {
    private Long id;
    private Long tenantId;
    private Long userId;
    private Long equipmentId;
    private Long equipmentUnitId;
    private String equipmentUnitSerialNo;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private String requestNote;
    private String decisionReason;
    private Long decidedByAdminId;
    private Instant decidedAt;
    private Instant createdAt;
    private Instant updatedAt;
    // Enriched for admin UI
    private String userName;
    private String userEmail;
    private String equipmentName;
    private String equipmentCategory;
}

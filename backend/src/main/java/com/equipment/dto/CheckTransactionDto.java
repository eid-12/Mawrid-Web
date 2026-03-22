package com.equipment.dto;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckTransactionDto {
    private Long id;
    private Long tenantId;
    private Long requestId;
    private Long equipmentUnitId;
    private String action;
    private Long adminId;
    private Instant actionAt;
    private String notes;
}

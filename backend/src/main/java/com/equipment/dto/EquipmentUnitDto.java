package com.equipment.dto;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentUnitDto {
    private Long id;
    private Long tenantId;
    private Long equipmentId;
    private String assetTag;
    private String serialNo;
    private String status;
    private String unitCondition;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;
}

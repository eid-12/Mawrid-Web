package com.equipment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateEquipmentUnitRequest {

    @NotNull
    private Long tenantId;
    @NotNull
    private Long equipmentId;
    private String assetTag;
    private String serialNo;
    @NotBlank
    private String status;
    private String unitCondition;
    private String notes;
}

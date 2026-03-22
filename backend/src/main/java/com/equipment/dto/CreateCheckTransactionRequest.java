package com.equipment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCheckTransactionRequest {

    @NotNull
    private Long requestId;
    @NotNull
    private Long equipmentUnitId;
    @NotBlank
    private String action; // e.g. CHECK_OUT, CHECK_IN
    private Long adminId;
    private String notes;
    private String returnUnitStatus; // AVAILABLE or MAINTENANCE on check-in
}

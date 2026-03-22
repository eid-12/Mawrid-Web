package com.equipment.dto;

import lombok.*;

import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantSettingsDto {
    private Long tenantId;
    private Integer maxBorrowDays;
    private Boolean approvalRequired;
    private LocalTime cutoffTime;
}

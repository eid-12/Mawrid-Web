package com.equipment.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScanResultDto {
    private String action;
    private Long requestId;
    private Long equipmentUnitId;
    private String equipmentName;
    private String serialNo;
    private String userName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long daysLeft;
}

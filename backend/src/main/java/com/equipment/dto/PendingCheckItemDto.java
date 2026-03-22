package com.equipment.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingCheckItemDto {
    private Long id;
    private Long requestId;
    private Long equipmentId;
    private Long equipmentUnitId;
    private String userName;
    private String userEmail;
    private String equipmentName;
    private String serialNo;
    private String status;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long daysLeft;
}

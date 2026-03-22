package com.equipment.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DecisionRequestDto {
    private String decisionReason;
    private Long decidedByAdminId;
}

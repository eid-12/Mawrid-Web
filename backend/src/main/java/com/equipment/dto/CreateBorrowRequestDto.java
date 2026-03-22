package com.equipment.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateBorrowRequestDto {

    @NotNull
    private Long userId;
    @NotNull
    private Long equipmentId;
    @NotNull
    private LocalDate startDate;
    @NotNull
    private LocalDate endDate;
    private String requestNote;
}

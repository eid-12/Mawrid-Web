package com.equipment.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateEquipmentRequest {

    @NotNull
    private Long tenantId;
    @NotBlank(message = "This field is required")
    @Pattern(regexp = "^[\\x20-\\x7E]+$", message = "Please enter the equipment name in English only (e.g., MacBook Pro).")
    private String name;
    @NotBlank(message = "This field is required")
    private String category;
    private String description;
    @NotNull(message = "This field is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer totalQuantity;
    @NotNull(message = "This field is required")
    private LocalDate availableFrom;
    @NotNull(message = "This field is required")
    private LocalDate availableTo;
    @Min(value = 1, message = "Max Borrow Days must be at least 1")
    private Integer maxBorrowDays;
    private String serialNoPrefix;
    private String defaultUnitCondition;
    private Long createdByAdminId;
}

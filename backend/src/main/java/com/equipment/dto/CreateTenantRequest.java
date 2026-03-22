package com.equipment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTenantRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Code is required")
    private String code;

    private String status;

    private String email;

    @Pattern(regexp = "^$|^(05|5|(\\+9665)|(009665))[0-9]{8}$", message = "Please enter a valid Saudi phone number (e.g., 05xxxxxxxx)")
    private String phone;
    private String location;
    private String website;
    private String description;

    private Integer maxBorrowDays;
    private Boolean approvalRequired;
    private String cutoffTime; // e.g. "17:00"
}

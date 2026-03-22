package com.equipment.dto;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantDto {
    private Long id;
    private String name;
    private String code;
    private String status;
    private Instant createdAt;
    private Integer userCount;
    private Integer equipmentCount;
    private Integer adminCount;
    private String email;
    private String phone;
    private String location;
    private String website;
    private String description;
}

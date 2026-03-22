package com.equipment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingCheckPageDto {
    private List<PendingCheckItemDto> items;
    private int page;
    private int size;
    private long totalItems;
    private int totalPages;
}

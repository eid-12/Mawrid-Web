package com.equipment.service;

import com.equipment.dto.CreateBorrowRequestDto;
import com.equipment.dto.DecisionRequestDto;
import com.equipment.entity.Equipment;
import com.equipment.entity.Tenant;
import com.equipment.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class BorrowRequestServiceSecurityTest {
    private BorrowRequestRepository requests;
    private EquipmentRepository equipment;
    private UserRepository users;
    private BorrowRequestService service;

    @BeforeEach
    void setUp() {
        requests = mock(BorrowRequestRepository.class);
        equipment = mock(EquipmentRepository.class);
        users = mock(UserRepository.class);
        service = new BorrowRequestService(
                requests,
                mock(TenantRepository.class),
                users,
                equipment,
                mock(ActivityLogService.class)
        );
    }

    @Test
    void approveCannotCrossTenantBoundary() {
        when(requests.findByIdAndTenantIdForUpdate(55L, 1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> service.approve(1L, 55L, new DecisionRequestDto()));
        verify(requests, never()).save(any());
    }

    @Test
    void adminCreateRejectsEquipmentFromAnotherTenant() {
        Tenant otherTenant = Tenant.builder().id(2L).status("ACTIVE").build();
        Equipment foreignEquipment = Equipment.builder().id(9L).tenant(otherTenant).build();
        when(equipment.findByIdForUpdate(9L)).thenReturn(Optional.of(foreignEquipment));
        CreateBorrowRequestDto dto = new CreateBorrowRequestDto();
        dto.setEquipmentId(9L);
        dto.setUserId(7L);
        dto.setStartDate(LocalDate.now().plusDays(1));
        dto.setEndDate(LocalDate.now().plusDays(2));

        assertThrows(IllegalArgumentException.class, () -> service.createRequest(1L, dto));
        verifyNoInteractions(users);
        verify(requests, never()).save(any());
    }
}

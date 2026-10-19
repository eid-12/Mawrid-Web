package com.equipment.service;

import com.equipment.dto.CreateCheckTransactionRequest;
import com.equipment.entity.BorrowRequest;
import com.equipment.entity.Equipment;
import com.equipment.entity.EquipmentUnit;
import com.equipment.entity.Tenant;
import com.equipment.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class CheckTransactionServiceSecurityTest {
    private CheckTransactionRepository transactions;
    private BorrowRequestRepository requests;
    private EquipmentUnitRepository units;
    private TenantRepository tenants;
    private CheckTransactionService service;

    @BeforeEach
    void setUp() {
        transactions = mock(CheckTransactionRepository.class);
        requests = mock(BorrowRequestRepository.class);
        units = mock(EquipmentUnitRepository.class);
        tenants = mock(TenantRepository.class);
        service = new CheckTransactionService(transactions, requests, units, mock(EquipmentRepository.class),
                tenants, mock(UserRepository.class), mock(ActivityLogService.class));
    }

    @Test
    void requestHistoryCannotCrossTenantBoundary() {
        when(requests.findByIdAndTenantId(99L, 1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.getByRequestId(1L, 99L));
        verifyNoInteractions(transactions);
    }

    @Test
    void handoverRejectsUnitFromAnotherTenant() {
        Tenant tenant = Tenant.builder().id(1L).status("ACTIVE").build();
        Tenant otherTenant = Tenant.builder().id(2L).status("ACTIVE").build();
        Equipment equipment = Equipment.builder().id(3L).tenant(tenant).build();
        BorrowRequest borrowRequest = BorrowRequest.builder().id(4L).tenant(tenant).equipment(equipment)
                .status("APPROVED").build();
        EquipmentUnit foreignUnit = EquipmentUnit.builder().id(5L).tenant(otherTenant).equipment(equipment)
                .status("AVAILABLE").build();
        when(tenants.findById(1L)).thenReturn(Optional.of(tenant));
        when(units.findByIdForUpdate(5L)).thenReturn(Optional.of(foreignUnit));
        when(requests.findByIdAndTenantIdForUpdate(4L, 1L)).thenReturn(Optional.of(borrowRequest));
        CreateCheckTransactionRequest input = CreateCheckTransactionRequest.builder()
                .requestId(4L).equipmentUnitId(5L).action("CHECK_OUT").adminId(7L).build();

        assertThrows(IllegalArgumentException.class, () -> service.create(1L, input));
        verify(transactions, never()).save(any());
        verify(units, never()).save(any());
    }
}

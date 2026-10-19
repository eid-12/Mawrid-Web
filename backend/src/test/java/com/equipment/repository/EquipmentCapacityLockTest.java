package com.equipment.repository;

import com.equipment.dto.UserCreateBorrowRequestDto;
import com.equipment.entity.Equipment;
import com.equipment.entity.Tenant;
import com.equipment.entity.User;
import com.equipment.entity.UserRole;
import com.equipment.service.ActivityLogService;
import com.equipment.service.BorrowRequestService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.show-sql=false",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.url=jdbc:h2:mem:capacity;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=5000"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import(BorrowRequestService.class)
class EquipmentCapacityLockTest {
    @MockBean(name = "seedFreshDatabase") CommandLineRunner seedFreshDatabase;
    @MockBean(name = "ensureLegacyUserPasswordColumnCompatibility") CommandLineRunner legacyCompatibility;
    @MockBean ActivityLogService activityLogService;
    @Autowired BorrowRequestService borrowRequestService;
    @Autowired BorrowRequestRepository borrowRequestRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired TenantRepository tenantRepository;
    @Autowired UserRepository userRepository;

    @Test
    void concurrentServiceRequestsCannotReserveTheSameLastCapacity() throws Exception {
        Tenant tenant = tenantRepository.saveAndFlush(Tenant.builder()
                .name("Concurrency College").code("CONC").status("ACTIVE").build());
        Equipment equipment = equipmentRepository.saveAndFlush(Equipment.builder()
                .tenant(tenant).name("Single unit").category("Test")
                .totalQuantity(1).availableQuantity(1)
                .availableFrom(LocalDate.now()).availableTo(LocalDate.now().plusDays(10)).build());
        User firstUser = saveUser(tenant, "first@example.test");
        User secondUser = saveUser(tenant, "second@example.test");
        UserCreateBorrowRequestDto request = UserCreateBorrowRequestDto.builder()
                .equipmentId(equipment.getId())
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(1))
                .build();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        try {
            Future<Throwable> first = pool.submit(() -> invokeCreate(start, firstUser.getId(), request));
            Future<Throwable> second = pool.submit(() -> invokeCreate(start, secondUser.getId(), request));
            start.countDown();
            List<Throwable> outcomes = java.util.Arrays.asList(
                    first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));

            assertEquals(1, outcomes.stream().filter(outcome -> outcome == null).count());
            Throwable rejection = outcomes.stream().filter(outcome -> outcome != null).findFirst().orElseThrow();
            assertInstanceOf(IllegalArgumentException.class, rejection);
            assertTrue(rejection.getMessage().contains("reserved"));
        } finally {
            pool.shutdownNow();
        }

        assertEquals(1, borrowRequestRepository.countByEquipmentIdAndStatusIn(
                equipment.getId(), List.of("PENDING", "APPROVED")));
    }

    private User saveUser(Tenant tenant, String email) {
        return userRepository.saveAndFlush(User.builder()
                .tenant(tenant)
                .role(UserRole.USER)
                .name(email)
                .email(email)
                .passwordHash("test-only")
                .isActive(true)
                .emailVerified(true)
                .build());
    }

    private Throwable invokeCreate(CountDownLatch start, Long userId, UserCreateBorrowRequestDto request) {
        try {
            assertTrue(start.await(5, TimeUnit.SECONDS));
            borrowRequestService.createRequestByUser(userId, request);
            return null;
        } catch (Throwable error) {
            return error;
        }
    }
}

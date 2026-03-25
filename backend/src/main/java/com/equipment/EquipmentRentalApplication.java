package com.equipment;

import com.equipment.entity.BorrowRequest;
import com.equipment.entity.Equipment;
import com.equipment.entity.EquipmentUnit;
import com.equipment.entity.Tenant;
import com.equipment.entity.TenantSettings;
import com.equipment.entity.User;
import com.equipment.entity.UserRole;
import com.equipment.repository.BorrowRequestRepository;
import com.equipment.repository.EquipmentRepository;
import com.equipment.repository.EquipmentUnitRepository;
import com.equipment.repository.TenantRepository;
import com.equipment.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableAsync;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@SpringBootApplication
@EnableAsync
public class EquipmentRentalApplication {
    private static final Logger log = LoggerFactory.getLogger(EquipmentRentalApplication.class);

    private static final String DEFAULT_PASSWORD_HASH =
            "$2a$10$dzgFoj3JFwc.ZZvG5HUIPOk.7c5TadvNXzu4mbGOicxcYGNuhBaQC";

    @Bean
    CommandLineRunner seedFreshDatabase(TenantRepository tenantRepository,
                                        UserRepository userRepository,
                                        EquipmentRepository equipmentRepository,
                                        EquipmentUnitRepository equipmentUnitRepository,
                                        BorrowRequestRepository borrowRequestRepository) {
        return args -> {
            // Guard: seed only on a fresh DB.
            if (tenantRepository.count() > 0) {
                return;
            }

            Instant now = Instant.now();
            LocalDate today = LocalDate.now();
            LocalDate inventoryAvailableFrom = LocalDate.of(2026, 3, 21);
            Random random = new Random(20260315L);

            record CollegeSeed(String name, String code, String adminEmail) {}
            List<CollegeSeed> collegeSeeds = List.of(
                    new CollegeSeed("Computer Science", "CS", "admin.cs@uoh.edu.sa"),
                    new CollegeSeed("Engineering", "ENG", "admin.eng@uoh.edu.sa"),
                    new CollegeSeed("Medicine", "MED", "admin.med@uoh.edu.sa"),
                    new CollegeSeed("Business", "BUS", "admin.bus@uoh.edu.sa"),
                    new CollegeSeed("Science", "SCI", "admin.sci@uoh.edu.sa"),
                    new CollegeSeed("Arts", "ART", "admin.art@uoh.edu.sa"),
                    new CollegeSeed("Education", "EDU", "admin.edu@uoh.edu.sa"),
                    new CollegeSeed("Pharmacy", "PHA", "admin.pha@uoh.edu.sa"),
                    new CollegeSeed("Architecture", "ARC", "admin.arc@uoh.edu.sa"),
                    new CollegeSeed("Law", "LAW", "admin.law@uoh.edu.sa")
            );

            User superAdmin = User.builder()
                    .tenant(null)
                    .role(UserRole.SUPER_ADMIN)
                    .name("Super Admin")
                    .email("super@uoh.edu.sa")
                    .phone("0500000000")
                    .passwordHash(DEFAULT_PASSWORD_HASH)
                    .isActive(true)
                    .emailVerified(true)
                    .emailVerifiedAt(now)
                    .passwordChangedAt(now)
                    .lastActiveAt(now)
                    .build();
            userRepository.save(superAdmin);

            List<Tenant> tenants = new ArrayList<>();
            List<User> admins = new ArrayList<>();
            List<List<User>> studentsByTenant = new ArrayList<>();
            List<List<Equipment>> equipmentByTenant = new ArrayList<>();

            for (int i = 0; i < collegeSeeds.size(); i++) {
                CollegeSeed seed = collegeSeeds.get(i);
                Tenant tenant = Tenant.builder()
                        .name(seed.name())
                        .code(seed.code())
                        .status("ACTIVE")
                        .email("college." + seed.code().toLowerCase() + "@uoh.edu.sa")
                        .phone("0551000" + String.format("%03d", i + 1))
                        .location("Hail - " + seed.name() + " Campus")
                        .website("https://uoh.edu.sa/" + seed.code().toLowerCase())
                        .description(seed.name() + " College")
                        .build();

                TenantSettings settings = TenantSettings.builder()
                        .tenant(tenant)
                        .maxBorrowDays(7)
                        .approvalRequired(true)
                        .cutoffTime(LocalTime.of(17, 0))
                        .build();
                tenant.setTenantSettings(settings);
                tenant = tenantRepository.save(tenant);
                tenants.add(tenant);

                User admin = User.builder()
                        .tenant(tenant)
                        .role(UserRole.ADMIN)
                        .name(seed.name() + " Admin")
                        .email(seed.adminEmail())
                        .phone("0552000" + String.format("%03d", i + 1))
                        .passwordHash(DEFAULT_PASSWORD_HASH)
                        .isActive(true)
                        .emailVerified(true)
                        .emailVerifiedAt(now)
                        .passwordChangedAt(now)
                        .lastActiveAt(now)
                        .build();
                admin = userRepository.save(admin);
                admins.add(admin);

                List<User> students = new ArrayList<>();
                for (int s = 1; s <= 10; s++) {
                    User student = User.builder()
                            .tenant(tenant)
                            .role(UserRole.USER)
                            .name(seed.code() + " Student " + s)
                            .email("student" + s + "." + seed.code().toLowerCase() + "@uoh.edu.sa")
                            .phone("056" + String.format("%07d", (i + 1) * 100 + s))
                            .passwordHash(DEFAULT_PASSWORD_HASH)
                            .isActive(true)
                            .emailVerified(true)
                            .emailVerifiedAt(now)
                            .passwordChangedAt(now)
                            .lastActiveAt(now)
                            .build();
                    students.add(userRepository.save(student));
                }
                studentsByTenant.add(students);

                String[] equipmentNames = {
                        seed.name() + " Laptops",
                        seed.name() + " Projectors",
                        seed.name() + " Lab Tools Kit",
                        seed.name() + " 24-inch Monitors",
                        seed.name() + " Workstations"
                };
                String[] categories = {"Computers", "Presentation", "Lab Tools", "Screens", "Computers"};
                String[] unitStatuses = {"AVAILABLE", "BORROWED", "MAINTENANCE"};

                List<Equipment> tenantEquipment = new ArrayList<>();
                for (int e = 0; e < equipmentNames.length; e++) {
                    Equipment equipment = Equipment.builder()
                            .tenant(tenant)
                            .name(equipmentNames[e])
                            .category(categories[e])
                            .description("Seeded inventory for " + seed.name())
                            .totalQuantity(0)
                            .availableQuantity(0)
                            .availableFrom(inventoryAvailableFrom)
                            .availableTo(inventoryAvailableFrom.plusYears(1))
                            .maxBorrowDays(7 + e)
                            .createdByAdminId(admin.getId())
                            .build();
                    equipment = equipmentRepository.save(equipment);

                    int available = 0;
                    for (int u = 1; u <= 3; u++) {
                        String status = unitStatuses[random.nextInt(unitStatuses.length)];
                        if ("AVAILABLE".equals(status)) available++;
                        EquipmentUnit unit = EquipmentUnit.builder()
                                .tenant(tenant)
                                .equipment(equipment)
                                .assetTag(seed.code() + "-AST-" + equipment.getId() + "-" + u)
                                .serialNo(seed.code() + "-SN-" + equipment.getId() + "-" + u)
                                .status(status)
                                .unitCondition("Excellent")
                                .notes("Seeded unit")
                                .build();
                        equipmentUnitRepository.save(unit);
                    }

                    equipment.setTotalQuantity(3);
                    equipment.setAvailableQuantity(available);
                    equipmentRepository.save(equipment);
                    tenantEquipment.add(equipment);
                }
                equipmentByTenant.add(tenantEquipment);
            }

            // 20 borrow requests with mixed statuses.
            String[] requestStatuses = {"PENDING", "APPROVED", "REJECTED", "RETURNED"};
            for (int i = 0; i < 20; i++) {
                int tenantIdx = i % tenants.size();
                Tenant tenant = tenants.get(tenantIdx);
                User admin = admins.get(tenantIdx);
                List<User> tenantStudents = studentsByTenant.get(tenantIdx);
                List<Equipment> tenantEquipment = equipmentByTenant.get(tenantIdx);

                User requester = tenantStudents.get(random.nextInt(tenantStudents.size()));
                Equipment equipment = tenantEquipment.get(random.nextInt(tenantEquipment.size()));
                String status = requestStatuses[i % requestStatuses.length];
                LocalDate start = today.minusDays(random.nextInt(10));
                LocalDate end = start.plusDays(1 + random.nextInt(5));

                BorrowRequest request = BorrowRequest.builder()
                        .tenant(tenant)
                        .user(requester)
                        .equipment(equipment)
                        .equipmentUnit(null)
                        .startDate(start)
                        .endDate(end)
                        .status(status)
                        .requestNote("Seed request #" + (i + 1))
                        .decisionReason("Seeded " + status.toLowerCase() + " request")
                        .decidedByAdminId("PENDING".equals(status) ? null : admin.getId())
                        .decidedAt("PENDING".equals(status) ? null : now.minusSeconds((long) i * 300))
                        .build();
                borrowRequestRepository.save(request);
            }
        };
    }

    @Bean
    CommandLineRunner ensureLegacyUserPasswordColumnCompatibility(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                Integer hasLegacyPasswordColumn = jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'users'
                          AND COLUMN_NAME = 'password'
                        """,
                        Integer.class
                );
                Integer hasPasswordHashColumn = jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'users'
                          AND COLUMN_NAME = 'password_hash'
                        """,
                        Integer.class
                );

                if (Integer.valueOf(1).equals(hasLegacyPasswordColumn)
                        && Integer.valueOf(1).equals(hasPasswordHashColumn)) {
                    jdbcTemplate.update("""
                            UPDATE users
                               SET password = password_hash
                             WHERE (password IS NULL OR password = '')
                               AND password_hash IS NOT NULL
                            """);

                    jdbcTemplate.execute("""
                            ALTER TABLE users
                            MODIFY COLUMN password VARCHAR(255) NULL DEFAULT NULL
                            """);
                    log.info("Applied legacy users.password compatibility patch.");
                }

                Integer hasLegacyUsernameColumn = jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'users'
                          AND COLUMN_NAME = 'username'
                        """,
                        Integer.class
                );

                if (Integer.valueOf(1).equals(hasLegacyUsernameColumn)) {
                    jdbcTemplate.update("""
                            UPDATE users
                               SET username = COALESCE(NULLIF(email, ''), name, CONCAT('user_', id))
                             WHERE username IS NULL OR username = ''
                            """);

                    jdbcTemplate.execute("""
                            ALTER TABLE users
                            MODIFY COLUMN username VARCHAR(255) NULL DEFAULT NULL
                            """);
                    log.info("Applied legacy users.username compatibility patch.");
                }
            } catch (Exception ex) {
                log.warn("Skipped legacy users compatibility patch: {}", ex.getMessage());
            }
        };
    }

    public static void main(String[] args) {
        SpringApplication.run(EquipmentRentalApplication.class, args);
    }
}

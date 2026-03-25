package com.equipment.repository;

import com.equipment.entity.User;
import com.equipment.entity.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    List<User> findByTenantId(Long tenantId);

    List<User> findByTenantIdAndRole(Long tenantId, UserRole role);

    List<User> findByRole(UserRole role);

    Page<User> findByRole(UserRole role, Pageable pageable);

    @Query("""
            select u
            from User u
            left join u.tenant t
            where (:role is null or u.role = :role)
              and (
                    :q is null
                    or trim(:q) = ''
                    or lower(u.name) like lower(concat('%', :q, '%'))
                    or lower(u.email) like lower(concat('%', :q, '%'))
                    or lower(coalesce(t.name, '')) like lower(concat('%', :q, '%'))
                  )
            """)
    Page<User> search(@Param("role") UserRole role, @Param("q") String q, Pageable pageable);

    boolean existsByEmail(String email);

    long countByRole(UserRole role);

    long countByIsActive(Boolean isActive);

    @Modifying
    @Transactional
    @Query("update User u set u.lastActiveAt = :lastActiveAt where u.email = :email")
    int updateLastActiveAtByEmail(@Param("email") String email, @Param("lastActiveAt") Instant lastActiveAt);

    @Modifying
    @Transactional
    @Query("""
            update User u
               set u.tenant = null
             where u.tenant.id = :tenantId
               and u.role <> com.equipment.entity.UserRole.SUPER_ADMIN
            """)
    int lockAndDetachByTenantId(@Param("tenantId") Long tenantId);

    @Modifying
    @Transactional
    @Query(value = "update users set password = :passwordHash where id = :userId", nativeQuery = true)
    int syncLegacyPasswordColumn(@Param("userId") Long userId, @Param("passwordHash") String passwordHash);

    @Modifying
    @Transactional
    @Query(value = "update users set username = :username where id = :userId", nativeQuery = true)
    int syncLegacyUsernameColumn(@Param("userId") Long userId, @Param("username") String username);
}

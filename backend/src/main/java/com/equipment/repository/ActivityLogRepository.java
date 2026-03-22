package com.equipment.repository;

import com.equipment.entity.ActivityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByTenantIdOrderByCreatedAtDesc(Long tenantId, Pageable pageable);
    List<ActivityLog> findTop5ByTenantIdOrderByCreatedAtDesc(Long tenantId);

    @Modifying
    @Transactional
    int deleteByTenantId(Long tenantId);
}

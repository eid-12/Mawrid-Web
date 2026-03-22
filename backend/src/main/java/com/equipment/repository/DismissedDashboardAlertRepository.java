package com.equipment.repository;

import com.equipment.entity.DismissedDashboardAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface DismissedDashboardAlertRepository extends JpaRepository<DismissedDashboardAlert, Long> {
    boolean existsByTenantIdAndAlertKey(Long tenantId, String alertKey);
    List<DismissedDashboardAlert> findByTenantId(Long tenantId);

    @Modifying
    @Transactional
    int deleteByTenantId(Long tenantId);
}

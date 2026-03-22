package com.equipment.repository;

import com.equipment.entity.CheckTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface CheckTransactionRepository extends JpaRepository<CheckTransaction, Long> {

    List<CheckTransaction> findByRequestId(Long requestId);

    List<CheckTransaction> findByTenantId(Long tenantId);

    @Modifying
    @Transactional
    int deleteByTenantId(Long tenantId);
}

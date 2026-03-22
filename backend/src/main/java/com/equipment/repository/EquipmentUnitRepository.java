package com.equipment.repository;

import com.equipment.entity.EquipmentUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface EquipmentUnitRepository extends JpaRepository<EquipmentUnit, Long> {

    @Query("SELECT COUNT(e) FROM EquipmentUnit e WHERE e.tenant.status = 'ACTIVE'")
    long countByTenantStatusActive();

    List<EquipmentUnit> findByTenantId(Long tenantId);

    List<EquipmentUnit> findByEquipmentId(Long equipmentId);
    List<EquipmentUnit> findByEquipmentIdAndStatus(Long equipmentId, String status);

    List<EquipmentUnit> findByTenantIdAndEquipmentId(Long tenantId, Long equipmentId);

    Optional<EquipmentUnit> findByTenantIdAndAssetTag(Long tenantId, String assetTag);

    Optional<EquipmentUnit> findByTenantIdAndSerialNo(Long tenantId, String serialNo);
    Optional<EquipmentUnit> findByTenantIdAndSerialNoIgnoreCase(Long tenantId, String serialNo);
    boolean existsByTenantIdAndSerialNo(Long tenantId, String serialNo);

    List<EquipmentUnit> findByTenantIdAndStatus(Long tenantId, String status);

    long countByEquipmentId(Long equipmentId);

    @Query("SELECT COUNT(eu) FROM EquipmentUnit eu WHERE eu.equipment.id = :equipmentId AND UPPER(eu.status) = 'AVAILABLE'")
    long countAvailableByEquipmentId(Long equipmentId);

    @Modifying
    @Transactional
    int deleteByTenantId(Long tenantId);
}

package com.equipment.repository;

import com.equipment.entity.TenantSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TenantSettingsRepository extends JpaRepository<TenantSettings, Long> {
}

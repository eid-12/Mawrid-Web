package com.equipment.service;

import com.equipment.entity.ActivityLog;
import com.equipment.entity.Tenant;
import com.equipment.repository.ActivityLogRepository;
import com.equipment.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final TenantRepository tenantRepository;

    @Transactional
    public void log(Long tenantId, String actorName, String actorRole, String actionType, String message, String status) {
        log(tenantId, null, actorName, actorRole, actionType, message, status);
    }

    @Transactional
    public void log(Long tenantId, Long adminId, String actorName, String actorRole, String actionType, String message, String status) {
        if (tenantId == null || message == null || message.isBlank()) return;
        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) return;
        ActivityLog log = ActivityLog.builder()
                .tenant(tenant)
                .adminId(adminId)
                .actorName(actorName)
                .actorRole(actorRole)
                .actionType(actionType)
                .message(message)
                .status(status)
                .build();
        activityLogRepository.save(log);
    }
}

package com.equipment.service;

import com.equipment.entity.User;
import com.equipment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Optional compatibility with legacy {@code users.password} / {@code users.username} columns.
 * Runs in a separate transaction so SQL issues cannot mark the main signup transaction rollback-only.
 */
@Service
@RequiredArgsConstructor
public class LegacyUserColumnSyncService {

    private static final Logger log = LoggerFactory.getLogger(LegacyUserColumnSyncService.class);
    private final UserRepository userRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void syncAfterUserPersist(User user) {
        if (user == null || user.getId() == null || user.getPasswordHash() == null) {
            return;
        }
        try {
            userRepository.syncLegacyPasswordColumn(user.getId(), user.getPasswordHash());
        } catch (Exception ex) {
            log.debug("Legacy password column sync skipped: {}", ex.getMessage());
        }
        try {
            String fallbackUsername = user.getEmail();
            if (fallbackUsername == null || fallbackUsername.isBlank()) {
                fallbackUsername = user.getName();
            }
            if (fallbackUsername != null && !fallbackUsername.isBlank()) {
                userRepository.syncLegacyUsernameColumn(user.getId(), fallbackUsername.trim());
            }
        } catch (Exception ex) {
            log.debug("Legacy username column sync skipped: {}", ex.getMessage());
        }
    }
}

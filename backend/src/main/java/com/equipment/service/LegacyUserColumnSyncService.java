package com.equipment.service;

import com.equipment.entity.User;
import com.equipment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Optional compatibility with legacy {@code users.password} / {@code users.username} columns.
 * <p>If those columns do not exist (normal schema: only {@code password_hash}), no UPDATE is run.</p>
 * Runs in a separate transaction so unexpected SQL issues cannot poison the main signup transaction.
 */
@Service
@RequiredArgsConstructor
public class LegacyUserColumnSyncService {

    private static final Logger log = LoggerFactory.getLogger(LegacyUserColumnSyncService.class);

    private static final int FLAG_PASSWORD = 1;
    private static final int FLAG_USERNAME = 2;

    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    /** Bitmask: {@link #FLAG_PASSWORD}, {@link #FLAG_USERNAME}; {@code null} = not resolved yet. */
    private volatile Integer legacyColumnFlags;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void syncAfterUserPersist(User user) {
        if (user == null || user.getId() == null || user.getPasswordHash() == null) {
            return;
        }
        int flags = resolveLegacyColumnFlags();
        if (flags == 0) {
            return;
        }
        if ((flags & FLAG_PASSWORD) != 0) {
            try {
                userRepository.syncLegacyPasswordColumn(user.getId(), user.getPasswordHash());
            } catch (Exception ex) {
                log.debug("Legacy password column sync failed: {}", ex.getMessage());
            }
        }
        if ((flags & FLAG_USERNAME) != 0) {
            try {
                String fallbackUsername = user.getEmail();
                if (fallbackUsername == null || fallbackUsername.isBlank()) {
                    fallbackUsername = user.getName();
                }
                if (fallbackUsername != null && !fallbackUsername.isBlank()) {
                    userRepository.syncLegacyUsernameColumn(user.getId(), fallbackUsername.trim());
                }
            } catch (Exception ex) {
                log.debug("Legacy username column sync failed: {}", ex.getMessage());
            }
        }
    }

    private int resolveLegacyColumnFlags() {
        Integer cached = legacyColumnFlags;
        if (cached != null) {
            return cached;
        }
        synchronized (this) {
            if (legacyColumnFlags != null) {
                return legacyColumnFlags;
            }
            int bits = 0;
            try {
                if (columnExists("password")) {
                    bits |= FLAG_PASSWORD;
                }
                if (columnExists("username")) {
                    bits |= FLAG_USERNAME;
                }
            } catch (Exception ex) {
                log.debug("Could not inspect users table for legacy columns: {}", ex.getMessage());
            }
            legacyColumnFlags = bits;
            return bits;
        }
    }

    private boolean columnExists(String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'users'
                          AND COLUMN_NAME = ?
                        """,
                Integer.class,
                columnName
        );
        return count != null && count == 1;
    }
}

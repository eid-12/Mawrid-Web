package com.equipment.repository;

import com.equipment.entity.UserToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface UserTokenRepository extends JpaRepository<UserToken, Long> {

    Optional<UserToken> findByTokenTypeAndTokenHash(String tokenType, String tokenHash);

    Optional<UserToken> findByUserIdAndTokenTypeAndTokenHash(Long userId, String tokenType, String tokenHash);

    void deleteByUserIdAndTokenType(Long userId, String tokenType);

    long deleteByTokenTypeAndExpiresAtBefore(String tokenType, Instant cutoff);
}


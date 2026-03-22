package com.equipment.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "user_tokens", indexes = {
        @Index(name = "idx_user_tokens_user_type_exp", columnList = "user_id,token_type,expires_at"),
        @Index(name = "idx_user_tokens_type_hash", columnList = "token_type,token_hash", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token_type", nullable = false, length = 32)
    private String tokenType; // EMAIL_VERIFY, PASSWORD_RESET

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash; // sha256 hex

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}


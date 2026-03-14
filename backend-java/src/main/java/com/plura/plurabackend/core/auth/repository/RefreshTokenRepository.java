package com.plura.plurabackend.core.auth.repository;

import com.plura.plurabackend.core.auth.model.RefreshToken;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByTokenAndRevokedAtIsNull(String token);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RefreshToken> findByToken(String token);

    @Modifying
    @Query(
        """
        UPDATE RefreshToken token
        SET token.revokedAt = :revokedAt
        WHERE token.user.id = :userId
            AND token.revokedAt IS NULL
        """
    )
    int revokeActiveTokensByUserId(
        @Param("userId") Long userId,
        @Param("revokedAt") LocalDateTime revokedAt
    );
}

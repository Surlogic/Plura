package com.plura.plurabackend.auth.repository;

import com.plura.plurabackend.auth.model.PasswordResetToken;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query(
        """
        UPDATE PasswordResetToken token
        SET token.consumedAt = :consumedAt
        WHERE token.user.id = :userId
            AND token.consumedAt IS NULL
        """
    )
    int consumeActiveTokensByUserId(
        @Param("userId") Long userId,
        @Param("consumedAt") LocalDateTime consumedAt
    );
}

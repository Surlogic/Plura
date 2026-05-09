package com.plura.plurabackend.core.auth.repository;

import com.plura.plurabackend.core.auth.model.AuthSession;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * AuthSessionRepository es un contrato interno del modulo autenticacion / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: sesiones, autenticacion y sesiones.
 */
public interface AuthSessionRepository extends JpaRepository<AuthSession, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AuthSession> findByRefreshTokenHash(String refreshTokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
        """
        SELECT session
        FROM AuthSession session
        WHERE session.refreshTokenHash = :refreshTokenHash
            OR session.previousRefreshTokenHash = :refreshTokenHash
        """
    )
    Optional<AuthSession> findByTrackedRefreshTokenHash(@Param("refreshTokenHash") String refreshTokenHash);

    List<AuthSession> findByUser_IdOrderByCreatedAtDesc(Long userId);

    Optional<AuthSession> findByIdAndUser_Id(String sessionId, Long userId);

    @Modifying
    @Query(
        """
        UPDATE AuthSession session
        SET session.revokedAt = :revokedAt,
            session.revokeReason = :revokeReason
        WHERE session.user.id = :userId
            AND session.revokedAt IS NULL
        """
    )
    int revokeActiveSessionsByUserId(
        @Param("userId") Long userId,
        @Param("revokedAt") LocalDateTime revokedAt,
        @Param("revokeReason") String revokeReason
    );
}

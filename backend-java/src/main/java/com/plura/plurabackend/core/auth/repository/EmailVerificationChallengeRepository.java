package com.plura.plurabackend.core.auth.repository;

import com.plura.plurabackend.core.auth.model.EmailVerificationChallenge;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * EmailVerificationChallengeRepository es un contrato interno del modulo autenticacion / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: email transaccional.
 */
public interface EmailVerificationChallengeRepository extends JpaRepository<EmailVerificationChallenge, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<EmailVerificationChallenge> findFirstByUser_IdAndConsumedAtIsNullOrderByCreatedAtDesc(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<EmailVerificationChallenge> findFirstByUser_IdOrderByCreatedAtDesc(Long userId);

    @Modifying
    @Query(
        """
        UPDATE EmailVerificationChallenge challenge
        SET challenge.consumedAt = :consumedAt
        WHERE challenge.user.id = :userId
            AND challenge.consumedAt IS NULL
        """
    )
    int consumeActiveChallengesByUserId(
        @Param("userId") Long userId,
        @Param("consumedAt") LocalDateTime consumedAt
    );
}

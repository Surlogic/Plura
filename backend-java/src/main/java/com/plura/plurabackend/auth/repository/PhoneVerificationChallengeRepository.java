package com.plura.plurabackend.auth.repository;

import com.plura.plurabackend.auth.model.PhoneVerificationChallenge;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PhoneVerificationChallengeRepository extends JpaRepository<PhoneVerificationChallenge, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PhoneVerificationChallenge> findFirstByUser_IdAndConsumedAtIsNullOrderByCreatedAtDesc(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PhoneVerificationChallenge> findFirstByUser_IdOrderByCreatedAtDesc(Long userId);

    Optional<PhoneVerificationChallenge> findTopByUser_IdOrderByCreatedAtDesc(Long userId);

    @Modifying
    @Query(
        """
        UPDATE PhoneVerificationChallenge challenge
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

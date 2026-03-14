package com.plura.plurabackend.core.auth.repository;

import com.plura.plurabackend.core.auth.model.AuthOtpChallenge;
import com.plura.plurabackend.core.auth.model.OtpChallengePurpose;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuthOtpChallengeRepository extends JpaRepository<AuthOtpChallenge, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AuthOtpChallenge> findFirstByUser_IdAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
        Long userId,
        OtpChallengePurpose purpose
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AuthOtpChallenge> findByIdAndUser_Id(String challengeId, Long userId);

    @Modifying
    @Query(
        """
        UPDATE AuthOtpChallenge challenge
        SET challenge.consumedAt = :consumedAt
        WHERE challenge.user.id = :userId
            AND challenge.purpose = :purpose
            AND challenge.consumedAt IS NULL
        """
    )
    int consumeActiveChallengesByUserIdAndPurpose(
        @Param("userId") Long userId,
        @Param("purpose") OtpChallengePurpose purpose,
        @Param("consumedAt") LocalDateTime consumedAt
    );
}

package com.plura.plurabackend.core.auth.repository;

import com.plura.plurabackend.core.auth.model.RegistrationPhoneVerificationAttempt;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RegistrationPhoneVerificationAttemptRepository
    extends JpaRepository<RegistrationPhoneVerificationAttempt, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RegistrationPhoneVerificationAttempt> findFirstByPhoneNumberAndConsumedAtIsNullOrderByCreatedAtDesc(
        String phoneNumber
    );

    Optional<RegistrationPhoneVerificationAttempt> findFirstByPhoneNumberOrderByCreatedAtDesc(String phoneNumber);

    @Modifying
    @Query(
        """
        UPDATE RegistrationPhoneVerificationAttempt attempt
        SET attempt.consumedAt = :consumedAt
        WHERE attempt.phoneNumber = :phoneNumber
            AND attempt.consumedAt IS NULL
        """
    )
    int consumeActiveAttemptsByPhoneNumber(
        @Param("phoneNumber") String phoneNumber,
        @Param("consumedAt") LocalDateTime consumedAt
    );
}

package com.plura.plurabackend.core.billing.subscriptions.repository;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.subscriptions.model.Subscription;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubscriptionRepository extends JpaRepository<Subscription, String> {

    Optional<Subscription> findByProfessionalId(Long professionalId);

    Optional<Subscription> findByProviderAndProviderSubscriptionId(
        PaymentProvider provider,
        String providerSubscriptionId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Subscription s WHERE s.professionalId = :professionalId")
    Optional<Subscription> findByProfessionalIdForUpdate(@Param("professionalId") Long professionalId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
        "SELECT s FROM Subscription s WHERE s.provider = :provider AND s.providerSubscriptionId = :providerSubscriptionId"
    )
    Optional<Subscription> findByProviderAndProviderSubscriptionIdForUpdate(
        @Param("provider") PaymentProvider provider,
        @Param("providerSubscriptionId") String providerSubscriptionId
    );
}

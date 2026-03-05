package com.plura.plurabackend.billing.payments.repository;

import com.plura.plurabackend.billing.payments.model.PaymentEvent;
import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentEventRepository extends JpaRepository<PaymentEvent, String> {

    Optional<PaymentEvent> findByProviderAndProviderEventId(
        PaymentProvider provider,
        String providerEventId
    );

    long countByProviderAndProviderEventId(
        PaymentProvider provider,
        String providerEventId
    );
}

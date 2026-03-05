package com.plura.plurabackend.billing.payments.repository;

import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.billing.payments.model.PaymentTransaction;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, String> {

    Optional<PaymentTransaction> findByProviderAndProviderPaymentId(
        PaymentProvider provider,
        String providerPaymentId
    );

    long countByProviderAndProviderPaymentId(
        PaymentProvider provider,
        String providerPaymentId
    );
}

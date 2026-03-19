package com.plura.plurabackend.core.billing.providerconnection.repository;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.providerconnection.model.ProfessionalPaymentProviderConnection;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessionalPaymentProviderConnectionRepository
    extends JpaRepository<ProfessionalPaymentProviderConnection, String> {

    Optional<ProfessionalPaymentProviderConnection> findByProfessionalIdAndProvider(
        Long professionalId,
        PaymentProvider provider
    );

    Optional<ProfessionalPaymentProviderConnection> findByProviderAndProviderUserId(
        PaymentProvider provider,
        String providerUserId
    );
}

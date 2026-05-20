package com.plura.plurabackend.core.billing.registration;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProfessionalRegistrationCheckoutIntentRepository
    extends JpaRepository<ProfessionalRegistrationCheckoutIntent, String> {

    Optional<ProfessionalRegistrationCheckoutIntent> findByCheckoutRef(String checkoutRef);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from ProfessionalRegistrationCheckoutIntent i where i.checkoutRef = :checkoutRef")
    Optional<ProfessionalRegistrationCheckoutIntent> findByCheckoutRefForUpdate(
        @Param("checkoutRef") String checkoutRef
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from ProfessionalRegistrationCheckoutIntent i where i.registrationReference = :registrationReference")
    Optional<ProfessionalRegistrationCheckoutIntent> findByRegistrationReferenceForUpdate(
        @Param("registrationReference") String registrationReference
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select i from ProfessionalRegistrationCheckoutIntent i
        where i.provider = :provider and i.providerSubscriptionId = :providerSubscriptionId
        """)
    Optional<ProfessionalRegistrationCheckoutIntent> findByProviderAndProviderSubscriptionIdForUpdate(
        @Param("provider") PaymentProvider provider,
        @Param("providerSubscriptionId") String providerSubscriptionId
    );
}

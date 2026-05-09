package com.plura.plurabackend.core.billing.payments.repository;

import com.plura.plurabackend.core.billing.payments.model.PaymentEvent;
import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * PaymentEventRepository es un contrato interno del modulo billing / pagos / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: pagos.
 */
public interface PaymentEventRepository extends JpaRepository<PaymentEvent, String> {

    Optional<PaymentEvent> findByProviderAndProviderEventId(
        PaymentProvider provider,
        String providerEventId
    );

    long countByProviderAndProviderEventId(
        PaymentProvider provider,
        String providerEventId
    );

    List<PaymentEvent> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);
}

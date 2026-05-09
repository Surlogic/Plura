package com.plura.plurabackend.core.billing.providerconnection.repository;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.providerconnection.model.ProfessionalPaymentProviderConnection;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ProfessionalPaymentProviderConnectionRepository es un contrato interno del modulo billing / conexion de proveedor / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: profesionales, proveedores externos, pagos.
 */
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

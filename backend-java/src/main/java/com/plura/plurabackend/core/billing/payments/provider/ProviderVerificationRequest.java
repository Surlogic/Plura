package com.plura.plurabackend.core.billing.payments.provider;

import java.math.BigDecimal;

/**
 * ProviderVerificationRequest es un modelo inmutable del modulo billing / pagos.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: proveedores externos.
 */
public record ProviderVerificationRequest(
    String providerPaymentId,
    String providerSubscriptionId,
    String externalReference,
    BigDecimal expectedAmount,
    String expectedCurrency,
    Long expectedProfessionalId
) {}

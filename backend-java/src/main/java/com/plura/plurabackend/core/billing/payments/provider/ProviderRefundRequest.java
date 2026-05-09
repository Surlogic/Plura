package com.plura.plurabackend.core.billing.payments.provider;

import java.math.BigDecimal;

/**
 * ProviderRefundRequest es un modelo inmutable del modulo billing / pagos.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: proveedores externos.
 */
public record ProviderRefundRequest(
    String providerPaymentId,
    Long professionalId,
    String refundReference,
    BigDecimal amount,
    String currency,
    String reason,
    String webhookUrl
) {}

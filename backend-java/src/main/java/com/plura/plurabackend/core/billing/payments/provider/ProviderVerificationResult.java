package com.plura.plurabackend.core.billing.payments.provider;

import java.math.BigDecimal;

/**
 * ProviderVerificationResult es un modelo inmutable del modulo billing / pagos.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: proveedores externos.
 */
public record ProviderVerificationResult(
    boolean finalApproved,
    String status,
    BigDecimal amount,
    String currency,
    Long professionalId,
    String planCode,
    String providerObjectId,
    String paymentTypeId,
    String paymentMethodId
) {}

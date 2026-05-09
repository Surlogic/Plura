package com.plura.plurabackend.core.billing.payments.provider;

import java.math.BigDecimal;

/**
 * ProviderRefundResult es un modelo inmutable del modulo billing / pagos.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: proveedores externos.
 */
public record ProviderRefundResult(
    String providerRefundId,
    String providerPaymentId,
    String status,
    BigDecimal amount,
    String currency,
    String rawResponseJson
) {}

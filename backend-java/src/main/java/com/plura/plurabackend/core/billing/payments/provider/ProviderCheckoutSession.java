package com.plura.plurabackend.core.billing.payments.provider;

/**
 * ProviderCheckoutSession es un modelo inmutable del modulo billing / pagos.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: proveedores externos, sesiones.
 */
public record ProviderCheckoutSession(
    String checkoutUrl,
    String providerSubscriptionId,
    String providerCustomerId
) {}

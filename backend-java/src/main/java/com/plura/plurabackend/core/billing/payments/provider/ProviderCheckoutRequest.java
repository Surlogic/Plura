package com.plura.plurabackend.core.billing.payments.provider;

import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import java.math.BigDecimal;

/**
 * ProviderCheckoutRequest es un modelo inmutable del modulo billing / pagos.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: proveedores externos.
 */
public record ProviderCheckoutRequest(
    String subscriptionId,
    Long professionalId,
    SubscriptionPlanCode plan,
    BigDecimal amount,
    String currency,
    String customerEmail,
    String customerName,
    String webhookUrl
) {}

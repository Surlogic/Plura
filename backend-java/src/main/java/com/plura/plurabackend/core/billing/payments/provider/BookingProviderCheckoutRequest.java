package com.plura.plurabackend.core.billing.payments.provider;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import java.math.BigDecimal;

/**
 * BookingProviderCheckoutRequest es un modelo inmutable del modulo billing / pagos.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: proveedores externos, reservas.
 */
public record BookingProviderCheckoutRequest(
    String transactionId,
    Long bookingId,
    Long professionalId,
    BigDecimal amount,
    String currency,
    String customerEmail,
    String customerName,
    String description,
    String splitCode,
    String webhookUrl,
    PaymentProvider provider
) {}

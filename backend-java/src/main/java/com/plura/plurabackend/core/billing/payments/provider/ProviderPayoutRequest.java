package com.plura.plurabackend.core.billing.payments.provider;

import java.math.BigDecimal;

/**
 * ProviderPayoutRequest es un modelo inmutable del modulo billing / pagos.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: proveedores externos.
 */
public record ProviderPayoutRequest(
    String payoutRecordId,
    Long bookingId,
    Long professionalId,
    BigDecimal amount,
    String currency,
    String country,
    String beneficiaryFirstName,
    String beneficiaryLastName,
    String beneficiaryDocumentType,
    String beneficiaryDocumentNumber,
    String bankCode,
    String bankBranch,
    String bankAccountNumber,
    String bankAccountType,
    String reason,
    String webhookUrl,
    String idempotencyKey
) {}

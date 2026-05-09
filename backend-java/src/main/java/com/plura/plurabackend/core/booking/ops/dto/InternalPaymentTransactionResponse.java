package com.plura.plurabackend.core.booking.ops.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * InternalPaymentTransactionResponse es un modelo inmutable del modulo reservas / operaciones internas / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: paneles internos, pagos.
 */
public record InternalPaymentTransactionResponse(
    String id,
    String transactionType,
    String status,
    String provider,
    String providerPaymentId,
    String externalReference,
    BigDecimal amount,
    String currency,
    String providerStatus,
    LocalDateTime createdAt,
    LocalDateTime approvedAt,
    LocalDateTime failedAt
) {}

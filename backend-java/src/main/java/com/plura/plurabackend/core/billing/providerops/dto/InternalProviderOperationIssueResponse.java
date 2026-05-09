package com.plura.plurabackend.core.billing.providerops.dto;

import java.time.LocalDateTime;

/**
 * InternalProviderOperationIssueResponse es un modelo inmutable del modulo billing / operaciones de proveedor / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: operaciones asincronicas, proveedores externos, paneles internos.
 */
public record InternalProviderOperationIssueResponse(
    String operationId,
    String operationType,
    String status,
    Long bookingId,
    String externalReference,
    Integer attemptCount,
    String lockedBy,
    LocalDateTime updatedAt,
    LocalDateTime nextAttemptAt,
    LocalDateTime leaseUntil,
    String lastError
) {}

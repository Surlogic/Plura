package com.plura.plurabackend.core.billing.providerops.dto;

import java.util.List;

/**
 * InternalProviderOperationAlertResponse es un modelo inmutable del modulo billing / operaciones de proveedor / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: operaciones asincronicas, proveedores externos, paneles internos.
 */
public record InternalProviderOperationAlertResponse(
    String code,
    boolean triggered,
    long count,
    long threshold,
    String message,
    List<InternalProviderOperationIssueResponse> samples
) {}

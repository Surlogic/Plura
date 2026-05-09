package com.plura.plurabackend.professional.paymentprovider.dto;

import java.time.LocalDateTime;

/**
 * ProfessionalPaymentProviderConnectionResponse es un modelo inmutable del modulo profesionales / proveedor de pago / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, proveedores externos, pagos.
 */
public record ProfessionalPaymentProviderConnectionResponse(
    String provider,
    String status,
    boolean connected,
    String providerAccountId,
    String providerUserId,
    String scope,
    LocalDateTime tokenExpiresAt,
    LocalDateTime connectedAt,
    LocalDateTime disconnectedAt,
    LocalDateTime lastSyncAt,
    String lastError
) {}

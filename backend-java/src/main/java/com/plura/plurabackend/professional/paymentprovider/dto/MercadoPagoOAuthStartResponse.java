package com.plura.plurabackend.professional.paymentprovider.dto;

import java.time.LocalDateTime;

/**
 * MercadoPagoOAuthStartResponse es un modelo inmutable del modulo profesionales / proveedor de pago / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: Mercado Pago, OAuth, autenticacion y sesiones.
 */
public record MercadoPagoOAuthStartResponse(
    String provider,
    String authorizationUrl,
    String state,
    LocalDateTime stateExpiresAt
) {}

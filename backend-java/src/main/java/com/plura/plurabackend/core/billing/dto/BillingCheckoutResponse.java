package com.plura.plurabackend.core.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * BillingCheckoutResponse es un DTO de respuesta del modulo billing / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: billing.
 */
@Data
@AllArgsConstructor
public class BillingCheckoutResponse {
    private String subscriptionId;
    private String checkoutUrl;
    private String provider;
    private String planCode;
}

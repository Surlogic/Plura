package com.plura.plurabackend.core.billing.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * BillingSubscriptionResponse es un DTO de respuesta del modulo billing / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: suscripciones, billing.
 */
@Data
@AllArgsConstructor
public class BillingSubscriptionResponse {
    private String subscriptionId;
    private String planCode;
    private String status;
    private String provider;
    private BigDecimal amount;
    private String currency;
    private LocalDateTime currentPeriodStart;
    private LocalDateTime currentPeriodEnd;
    private Boolean cancelAtPeriodEnd;
    private boolean premiumEnabled;
}

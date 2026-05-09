package com.plura.plurabackend.core.billing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * BillingCreateSubscriptionRequest es un DTO de entrada del modulo billing / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: suscripciones, billing.
 */
@Data
public class BillingCreateSubscriptionRequest {

    @NotBlank
    private String planCode;
}

package com.plura.plurabackend.core.billing.dto;

import lombok.Data;

/**
 * BillingCancelRequest es un DTO de entrada del modulo billing / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: billing.
 */
@Data
public class BillingCancelRequest {
    private Boolean immediate;
}

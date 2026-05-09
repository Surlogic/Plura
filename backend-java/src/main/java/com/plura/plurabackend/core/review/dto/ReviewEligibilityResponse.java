package com.plura.plurabackend.core.review.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * ReviewEligibilityResponse es un DTO de respuesta del modulo resenas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: resenas.
 */
@Data
@AllArgsConstructor
public class ReviewEligibilityResponse {
    private boolean eligible;
    private boolean alreadyReviewed;
    private String reason;
}

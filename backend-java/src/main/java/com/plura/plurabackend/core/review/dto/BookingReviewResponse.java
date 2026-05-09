package com.plura.plurabackend.core.review.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * BookingReviewResponse es un DTO de respuesta del modulo resenas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas, resenas.
 */
@Data
@AllArgsConstructor
public class BookingReviewResponse {
    private Long id;
    private Long bookingId;
    private Long professionalId;
    private Integer rating;
    private String text;
    private String authorDisplayName;
    private boolean textHiddenByProfessional;
    private boolean reportedByProfessional;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

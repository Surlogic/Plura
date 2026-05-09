package com.plura.plurabackend.professional.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * MediaPresentationDto es un DTO del modulo profesionales / contratos DTO.
 * Responsabilidad: transportar datos entre capas sin exponer entidades JPA.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediaPresentationDto {
    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private Double positionX;

    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private Double positionY;

    @DecimalMin("1.0")
    @DecimalMax("3.0")
    private Double zoom;
}

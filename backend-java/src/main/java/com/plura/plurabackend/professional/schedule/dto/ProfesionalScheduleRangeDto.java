package com.plura.plurabackend.professional.schedule.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ProfesionalScheduleRangeDto es un DTO del modulo profesionales / agenda / contratos DTO.
 * Responsabilidad: transportar datos entre capas sin exponer entidades JPA.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: agenda.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfesionalScheduleRangeDto {
    @Size(max = 80)
    private String id;

    @NotBlank
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$")
    private String start;

    @NotBlank
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$")
    private String end;
}

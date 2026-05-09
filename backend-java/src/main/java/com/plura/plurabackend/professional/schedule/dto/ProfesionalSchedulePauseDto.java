package com.plura.plurabackend.professional.schedule.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ProfesionalSchedulePauseDto es un DTO del modulo profesionales / agenda / contratos DTO.
 * Responsabilidad: transportar datos entre capas sin exponer entidades JPA.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: agenda.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfesionalSchedulePauseDto {
    @Size(max = 80)
    private String id;

    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$")
    private String startDate;

    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$")
    private String endDate;

    @Size(max = 500)
    private String note;
}

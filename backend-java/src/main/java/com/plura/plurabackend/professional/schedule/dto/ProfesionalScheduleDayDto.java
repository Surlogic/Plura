package com.plura.plurabackend.professional.schedule.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ProfesionalScheduleDayDto es un DTO del modulo profesionales / agenda / contratos DTO.
 * Responsabilidad: transportar datos entre capas sin exponer entidades JPA.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: agenda.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfesionalScheduleDayDto {
    @Pattern(regexp = "^(?i)(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$")
    private String day;
    private boolean enabled;
    private boolean paused;

    @Valid
    private List<ProfesionalScheduleRangeDto> ranges;
}

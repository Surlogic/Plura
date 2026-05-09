package com.plura.plurabackend.professional.schedule.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ProfesionalScheduleDto es un DTO del modulo profesionales / agenda / contratos DTO.
 * Responsabilidad: transportar datos entre capas sin exponer entidades JPA.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: agenda.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfesionalScheduleDto {
    @NotNull
    @Size(min = 1, max = 7)
    @Valid
    private List<ProfesionalScheduleDayDto> days;

    @Valid
    private List<ProfesionalSchedulePauseDto> pauses;

    @Positive
    private Integer slotDurationMinutes;
}

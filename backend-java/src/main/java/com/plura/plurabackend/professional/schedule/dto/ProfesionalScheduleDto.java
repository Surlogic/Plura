package com.plura.plurabackend.professional.schedule.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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

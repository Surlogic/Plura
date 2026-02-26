package com.plura.plurabackend.professional.schedule.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfesionalScheduleDto {
    private List<ProfesionalScheduleDayDto> days;
    private List<ProfesionalSchedulePauseDto> pauses;
}

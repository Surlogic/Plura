package com.plura.plurabackend.professional.schedule.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfesionalScheduleDayDto {
    private String day;
    private boolean enabled;
    private boolean paused;
    private List<ProfesionalScheduleRangeDto> ranges;
}

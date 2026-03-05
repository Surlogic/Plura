package com.plura.plurabackend.professional.schedule.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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

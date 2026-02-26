package com.plura.plurabackend.professional.schedule.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfesionalScheduleRangeDto {
    private String id;
    private String start;
    private String end;
}

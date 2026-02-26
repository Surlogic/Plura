package com.plura.plurabackend.professional.schedule.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfesionalSchedulePauseDto {
    private String id;
    private String startDate;
    private String endDate;
    private String note;
}

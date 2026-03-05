package com.plura.plurabackend.professional.schedule.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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

package com.plura.plurabackend.professional.dto;

import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalPublicPageResponse {
    private String id;
    private String slug;
    private String fullName;
    private String rubro;
    private String headline;
    private String about;
    private String location;
    private List<String> photos;
    private ProfesionalScheduleDto schedule;
    private List<ProfesionalServiceResponse> services;
}

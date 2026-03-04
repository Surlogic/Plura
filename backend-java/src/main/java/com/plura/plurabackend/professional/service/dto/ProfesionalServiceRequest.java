package com.plura.plurabackend.professional.service.dto;

import lombok.Data;

@Data
public class ProfesionalServiceRequest {
    private String name;
    private String price;
    private String duration;
    private Integer postBufferMinutes;
    private Boolean active;
}

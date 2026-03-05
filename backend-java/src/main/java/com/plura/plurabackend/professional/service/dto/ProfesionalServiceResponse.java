package com.plura.plurabackend.professional.service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalServiceResponse {
    private String id;
    private String name;
    private String description;
    private String price;
    private String duration;
    private String imageUrl;
    private Integer postBufferMinutes;
    private Boolean active;
}

package com.plura.plurabackend.profesional.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalServiceResponse {
    private String id;
    private String name;
    private String price;
    private String duration;
}

package com.plura.plurabackend.professional.dto;

import java.util.List;
import lombok.Data;

@Data
public class ProfesionalPublicPageUpdateRequest {
    private String headline;
    private String about;
    private List<String> photos;
}

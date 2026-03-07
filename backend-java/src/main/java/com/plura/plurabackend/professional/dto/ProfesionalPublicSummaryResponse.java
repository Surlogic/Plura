package com.plura.plurabackend.professional.dto;

import com.plura.plurabackend.category.dto.CategoryResponse;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalPublicSummaryResponse {
    private String id;
    private String slug;
    private String fullName;
    private String rubro;
    private String location;
    private String headline;
    private List<CategoryResponse> categories;
    private String logoUrl;
}

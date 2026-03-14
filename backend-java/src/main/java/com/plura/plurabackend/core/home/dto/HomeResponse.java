package com.plura.plurabackend.core.home.dto;

import com.plura.plurabackend.core.category.dto.CategoryResponse;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class HomeResponse {
    private HomeStatsResponse stats;
    private List<CategoryResponse> categories;
    private List<HomeTopProfessionalResponse> topProfessionals;
}

package com.plura.plurabackend.home.dto;

import com.plura.plurabackend.category.dto.CategoryResponse;
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

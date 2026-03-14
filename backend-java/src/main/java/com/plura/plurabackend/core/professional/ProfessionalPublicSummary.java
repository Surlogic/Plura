package com.plura.plurabackend.core.professional;

import com.plura.plurabackend.core.category.dto.CategoryResponse;
import java.util.List;

public record ProfessionalPublicSummary(
    Long professionalId,
    String slug,
    String fullName,
    String rubro,
    String location,
    String publicHeadline,
    List<CategoryResponse> categories,
    String logoUrl
) {}

package com.plura.plurabackend.core.professional;

import com.plura.plurabackend.core.category.model.Category;
import java.util.Set;

public record ProfessionalProfileRegistrationCommand(
    Set<Category> categories,
    String rubro,
    String country,
    String city,
    String fullAddress,
    String location,
    Double latitude,
    Double longitude,
    String tipoCliente
) {}

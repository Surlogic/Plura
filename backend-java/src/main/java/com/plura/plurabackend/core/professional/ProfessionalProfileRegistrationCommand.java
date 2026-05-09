package com.plura.plurabackend.core.professional;

import com.plura.plurabackend.core.category.model.Category;
import java.util.Set;

/**
 * ProfessionalProfileRegistrationCommand es un modelo inmutable del modulo profesionales.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, perfiles.
 */
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

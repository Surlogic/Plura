package com.plura.plurabackend.professional.dto;

import com.plura.plurabackend.core.category.dto.CategoryResponse;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * ProfesionalPublicSummaryResponse es un DTO de respuesta del modulo profesionales / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: superficie publica.
 */
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
    private Double rating;
    private Integer reviewsCount;
}

package com.plura.plurabackend.core.home.dto;

import com.plura.plurabackend.core.category.dto.CategoryResponse;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * HomeResponse es un DTO de respuesta del modulo home / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: home publica.
 */
@Data
@AllArgsConstructor
public class HomeResponse {
    private HomeStatsResponse stats;
    private List<CategoryResponse> categories;
    private List<HomeTopProfessionalResponse> topProfessionals;
}

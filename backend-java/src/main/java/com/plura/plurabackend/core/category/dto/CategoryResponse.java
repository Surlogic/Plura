package com.plura.plurabackend.core.category.dto;

import java.util.UUID;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * CategoryResponse es un DTO de respuesta del modulo categorias / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: categorias.
 */
@Data
@NoArgsConstructor
public class CategoryResponse {
    private UUID id;
    private String name;
    private String slug;
    private String imageUrl;
    private Integer displayOrder;
    private Long professionalsCount;

    public CategoryResponse(
        UUID id,
        String name,
        String slug,
        String imageUrl,
        Integer displayOrder
    ) {
        this(id, name, slug, imageUrl, displayOrder, null);
    }

    public CategoryResponse(
        UUID id,
        String name,
        String slug,
        String imageUrl,
        Integer displayOrder,
        Long professionalsCount
    ) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.imageUrl = imageUrl;
        this.displayOrder = displayOrder;
        this.professionalsCount = professionalsCount;
    }
}

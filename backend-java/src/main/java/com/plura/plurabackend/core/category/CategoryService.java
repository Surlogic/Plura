package com.plura.plurabackend.core.category;

import com.plura.plurabackend.core.category.dto.CategoryResponse;
import com.plura.plurabackend.core.category.model.Category;
import com.plura.plurabackend.core.category.repository.CategoryRepository;
import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * CategoryService es un servicio de negocio del modulo categorias.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: categoryRepository.
 * Foco funcional: categorias, servicios.
 */
@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    /**
     * Devuelve el listado de activos categories aplicando permisos y filtros del caso de uso.
     */
    @Cacheable("activeCategories")
    public List<CategoryResponse> listActiveCategories() {
        return categoryRepository.findByActiveTrueOrderByDisplayOrderAscNameAsc()
            .stream()
            .map(this::mapResponse)
            .toList();
    }

    /**
     * Mapea respuesta desde el modelo interno al contrato que usa otra capa.
     */
    private CategoryResponse mapResponse(Category category) {
        return new CategoryResponse(
            category.getId(),
            category.getName(),
            category.getSlug(),
            category.getImageUrl(),
            category.getDisplayOrder()
        );
    }
}

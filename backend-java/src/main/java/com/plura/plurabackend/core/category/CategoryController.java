package com.plura.plurabackend.core.category;

import com.plura.plurabackend.core.category.dto.CategoryResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * CategoryController es un controlador REST del modulo categorias.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: traduce requests/responses y evita mezclar reglas de negocio en la capa web.
 * Foco funcional: categorias.
 */
@RestController
@RequestMapping
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    /**
     * Devuelve el listado de categories aplicando permisos y filtros del caso de uso.
     */
    @GetMapping({"/categories", "/api/categories"})
    public List<CategoryResponse> listCategories() {
        return categoryService.listActiveCategories();
    }
}

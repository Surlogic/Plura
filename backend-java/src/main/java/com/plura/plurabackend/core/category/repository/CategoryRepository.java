package com.plura.plurabackend.core.category.repository;

import com.plura.plurabackend.core.category.model.Category;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * CategoryRepository es un contrato interno del modulo categorias / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: categorias.
 */
public interface CategoryRepository extends JpaRepository<Category, UUID> {
    Optional<Category> findBySlug(String slug);

    Optional<Category> findBySlugIgnoreCaseAndActiveTrue(String slug);

    List<Category> findBySlugIn(Collection<String> slugs);

    List<Category> findByActiveTrueOrderByDisplayOrderAscNameAsc();

    long countByActiveTrue();
}

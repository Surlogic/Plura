package com.plura.plurabackend.category.repository;

import com.plura.plurabackend.category.model.Category;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    Optional<Category> findBySlug(String slug);

    List<Category> findBySlugIn(Collection<String> slugs);

    List<Category> findByActiveTrueOrderByDisplayOrderAscNameAsc();

    long countByActiveTrue();
}

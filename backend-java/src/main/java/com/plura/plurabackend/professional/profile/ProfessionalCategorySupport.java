package com.plura.plurabackend.professional.profile;

import com.plura.plurabackend.core.category.dto.CategoryResponse;
import com.plura.plurabackend.core.category.model.Category;
import com.plura.plurabackend.core.category.repository.CategoryRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ProfessionalCategorySupport {

    private static final Map<String, String> LEGACY_CATEGORY_ALIASES = Map.ofEntries(
        Map.entry("peluqueria", "cabello"),
        Map.entry("cejas", "pestanas-cejas"),
        Map.entry("pestanas", "pestanas-cejas"),
        Map.entry("faciales", "estetica-facial")
    );

    private final CategoryRepository categoryRepository;

    public ProfessionalCategorySupport(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public String resolvePrimaryRubro(ProfessionalProfile profile) {
        Set<Category> categories = profile.getCategories();
        if (categories == null || categories.isEmpty()) {
            return profile.getRubro();
        }
        return categories.stream()
            .sorted(categoryComparator())
            .map(Category::getName)
            .findFirst()
            .orElse(profile.getRubro());
    }

    public List<CategoryResponse> mapCategories(Set<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            return List.of();
        }
        return categories.stream()
            .sorted(categoryComparator())
            .map(category -> new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.getImageUrl(),
                category.getDisplayOrder()
            ))
            .toList();
    }

    public boolean matchesCategoryFilter(
        ProfessionalProfile profile,
        UUID categoryId,
        String categorySlug
    ) {
        if (categoryId == null && (categorySlug == null || categorySlug.isBlank())) {
            return true;
        }
        Set<Category> categories = profile.getCategories();
        if (categories == null || categories.isEmpty()) {
            return false;
        }
        if (categoryId != null && categories.stream().noneMatch(category -> categoryId.equals(category.getId()))) {
            return false;
        }
        if (categorySlug != null && !categorySlug.isBlank()) {
            return categories.stream().anyMatch(category -> categorySlug.equalsIgnoreCase(category.getSlug()));
        }
        return true;
    }

    public Set<Category> resolveCategoriesBySlugs(List<String> rawSlugs) {
        if (rawSlugs == null || rawSlugs.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccioná al menos un rubro");
        }
        Set<String> slugs = rawSlugs.stream()
            .map(slug -> slug == null ? "" : slug.trim().toLowerCase(Locale.ROOT))
            .map(this::mapLegacyCategorySlug)
            .filter(slug -> !slug.isBlank())
            .collect(Collectors.toCollection(LinkedHashSet::new));
        if (slugs.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccioná al menos un rubro");
        }
        List<Category> categories = categoryRepository.findBySlugIn(slugs);
        Set<String> found = categories.stream().map(Category::getSlug).collect(Collectors.toSet());
        Set<String> missing = slugs.stream()
            .filter(slug -> !found.contains(slug))
            .collect(Collectors.toCollection(LinkedHashSet::new));
        if (!missing.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Rubros inválidos: " + String.join(", ", missing)
            );
        }
        return new LinkedHashSet<>(categories);
    }

    public void applyCategories(ProfessionalProfile profile, Set<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccioná al menos un rubro");
        }
        profile.setCategories(new LinkedHashSet<>(categories));
        String primary = categories.stream()
            .sorted(categoryComparator())
            .map(Category::getName)
            .findFirst()
            .orElse(profile.getRubro());
        profile.setRubro(primary);
    }

    private String mapLegacyCategorySlug(String slug) {
        return LEGACY_CATEGORY_ALIASES.getOrDefault(slug, slug);
    }

    private Comparator<Category> categoryComparator() {
        return Comparator.comparingInt(
            (Category category) -> category.getDisplayOrder() == null ? Integer.MAX_VALUE : category.getDisplayOrder()
        ).thenComparing(Category::getName);
    }
}

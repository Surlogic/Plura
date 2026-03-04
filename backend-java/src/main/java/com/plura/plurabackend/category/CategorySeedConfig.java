package com.plura.plurabackend.category;

import com.plura.plurabackend.category.model.Category;
import com.plura.plurabackend.category.repository.CategoryRepository;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CategorySeedConfig {

    private record SeedCategory(
        String name,
        String slug,
        String imageUrl,
        int displayOrder
    ) {}

    private static final List<SeedCategory> DEFAULT_CATEGORIES = List.of(
        new SeedCategory("Cabello", "cabello", "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80", 1),
        new SeedCategory("Uñas", "unas", "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80", 2),
        new SeedCategory("Barbería", "barberia", "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80", 3),
        new SeedCategory("Pestañas y Cejas", "pestanas-cejas", "https://images.pexels.com/photos/3985325/pexels-photo-3985325.jpeg?auto=compress&cs=tinysrgb&w=1200", 4),
        new SeedCategory("Estética Facial", "estetica-facial", "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80", 5),
        new SeedCategory("Depilación", "depilacion", "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=1200&q=80", 6),
        new SeedCategory("Masajes", "masajes", "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=1200&q=80", 7),
        new SeedCategory("Spa", "spa", "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80", 8),
        new SeedCategory("Maquillaje", "maquillaje", "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1200&q=80", 9),
        new SeedCategory("Cosmetología", "cosmetologia", "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80", 10),
        new SeedCategory("Tratamientos Corporales", "tratamientos-corporales", "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80", 11),
        new SeedCategory("Dermocosmética", "dermocosmetica", "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80", 12),
        new SeedCategory("Medicina Estética", "medicina-estetica", "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=1200&q=80", 13),
        new SeedCategory("Micropigmentación", "micropigmentacion", "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80", 14),
        new SeedCategory("Bienestar Holístico", "bienestar-holistico", "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80", 15)
    );

    @Bean
    CommandLineRunner seedCategories(CategoryRepository categoryRepository) {
        return args -> {
            for (SeedCategory seed : DEFAULT_CATEGORIES) {
                Category category = categoryRepository.findBySlug(seed.slug()).orElseGet(Category::new);
                category.setName(seed.name());
                category.setSlug(seed.slug());
                category.setImageUrl(seed.imageUrl());
                category.setDisplayOrder(seed.displayOrder());
                if (category.getActive() == null) {
                    category.setActive(true);
                }
                categoryRepository.save(category);
            }
        };
    }
}

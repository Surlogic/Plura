package com.plura.plurabackend.category;

import com.plura.plurabackend.category.dto.CategoryResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping({"/categories", "/api/categories"})
    public List<CategoryResponse> listCategories() {
        return categoryService.listActiveCategories();
    }
}

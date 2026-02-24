package com.plura.plurabackend.profesional;

import com.plura.plurabackend.profesional.dto.ProfesionalPublicPageResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/profesionales")
public class ProfesionalPublicController {

    private final ProfesionalPublicPageService profesionalPublicPageService;

    public ProfesionalPublicController(ProfesionalPublicPageService profesionalPublicPageService) {
        this.profesionalPublicPageService = profesionalPublicPageService;
    }

    @GetMapping("/{slug}")
    public ProfesionalPublicPageResponse getProfesionalBySlug(@PathVariable String slug) {
        return profesionalPublicPageService.getPublicPageBySlug(slug);
    }
}

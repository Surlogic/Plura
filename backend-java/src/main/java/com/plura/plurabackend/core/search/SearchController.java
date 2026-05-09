package com.plura.plurabackend.core.search;

import com.plura.plurabackend.core.analytics.tracking.AppProductEventTrackingService;
import jakarta.servlet.http.HttpServletRequest;
import com.plura.plurabackend.core.search.dto.SearchResponse;
import com.plura.plurabackend.core.search.dto.SearchSuggestResponse;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * SearchController es un controlador REST del modulo busqueda.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /api/search y deja la logica pesada en servicios.
 * Foco funcional: busqueda.
 */
@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;
    private final AppProductEventTrackingService appProductEventTrackingService;

    public SearchController(
        SearchService searchService,
        AppProductEventTrackingService appProductEventTrackingService
    ) {
        this.searchService = searchService;
        this.appProductEventTrackingService = appProductEventTrackingService;
    }

    /**
     * Ejecuta la logica de busqueda manteniendola encapsulada en este componente.
     */
    @GetMapping
    public SearchResponse search(
    /**
     * Resuelve authenticated user id normalizando entradas y defaults del modulo.
     */
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String query,
        @RequestParam(required = false) String categorySlug,
        @RequestParam(required = false) Double lat,
        @RequestParam(required = false) Double lng,
        @RequestParam(required = false) Double radiusKm,
        @RequestParam(required = false) String city,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(required = false, defaultValue = "false") boolean availableNow,
        @RequestParam(required = false) Integer page,
        @RequestParam(required = false) Integer size,
        @RequestParam(required = false) String sort,
        HttpServletRequest request,
        Authentication authentication
    ) {
        SearchResponse response = searchService.search(
            query,
            type,
            categorySlug,
            lat,
            lng,
            radiusKm,
            city,
            date,
            from,
            to,
            availableNow,
            page,
            size,
            sort
        );
        appProductEventTrackingService.trackSearch(
            request == null ? null : request.getHeader("X-Plura-Client-Platform"),
            request == null ? null : request.getHeader(AppProductEventTrackingService.ANALYTICS_SESSION_HEADER),
            resolveAuthenticatedUserId(authentication),
            type,
            query,
            categorySlug,
            city,
            lat,
            lng,
            radiusKm,
            date,
            from,
            to,
            availableNow,
            page,
            size,
            sort,
            response == null ? 0L : response.getTotal()
        );
        return response;
    }

    private Long resolveAuthenticatedUserId(Authentication authentication) {
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken
            || authentication.getPrincipal() == null) {
            return null;
        }
        try {
            return Long.valueOf(authentication.getPrincipal().toString());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    /**
     * Ejecuta la logica de suggest manteniendola encapsulada en este componente.
     */
    @GetMapping("/suggest")
    public SearchSuggestResponse suggest(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) Double lat,
        @RequestParam(required = false) Double lng,
        @RequestParam(required = false) String city,
        @RequestParam(required = false) Double radiusKm,
        @RequestParam(required = false) Integer limit
    ) {
        return searchService.suggest(q, lat, lng, city, radiusKm, limit);
    }
}

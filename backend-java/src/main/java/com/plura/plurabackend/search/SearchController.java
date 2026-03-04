package com.plura.plurabackend.search;

import com.plura.plurabackend.search.dto.SearchResponse;
import com.plura.plurabackend.search.dto.SearchSuggestResponse;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public SearchResponse search(
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
        @RequestParam(required = false) String sort
    ) {
        return searchService.search(
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
    }

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

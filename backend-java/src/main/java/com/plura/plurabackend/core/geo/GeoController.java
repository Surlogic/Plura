package com.plura.plurabackend.core.geo;

import com.plura.plurabackend.core.geo.dto.GeoAutocompleteItemResponse;
import com.plura.plurabackend.core.geo.dto.GeoForwardGeocodeResponse;
import com.plura.plurabackend.core.geo.dto.GeoLocationSuggestionResponse;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/geo")
public class GeoController {

    private static final CacheControl GEO_CACHE_CONTROL = CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic();

    private final GeoAutocompleteRepository geoAutocompleteRepository;
    private final GeoForwardGeocodeService geoForwardGeocodeService;

    public GeoController(
        GeoAutocompleteRepository geoAutocompleteRepository,
        GeoForwardGeocodeService geoForwardGeocodeService
    ) {
        this.geoAutocompleteRepository = geoAutocompleteRepository;
        this.geoForwardGeocodeService = geoForwardGeocodeService;
    }

    @GetMapping("/autocomplete")
    public ResponseEntity<List<GeoAutocompleteItemResponse>> autocomplete(
        @RequestParam String q,
        @RequestParam(required = false, defaultValue = "8") Integer limit
    ) {
        List<GeoAutocompleteItemResponse> result = geoAutocompleteRepository.autocomplete(q, limit == null ? 8 : limit);
        return ResponseEntity.ok().cacheControl(GEO_CACHE_CONTROL).body(result);
    }

    @GetMapping("/geocode")
    public ResponseEntity<GeoForwardGeocodeResponse> geocode(@RequestParam String q) {
        GeoForwardGeocodeResponse result = geoForwardGeocodeService.geocode(q);
        return ResponseEntity.ok().cacheControl(GEO_CACHE_CONTROL).body(result);
    }

    @GetMapping("/suggest")
    public ResponseEntity<List<GeoLocationSuggestionResponse>> suggest(
        @RequestParam String q,
        @RequestParam(required = false, defaultValue = "6") Integer limit
    ) {
        List<GeoLocationSuggestionResponse> result = geoForwardGeocodeService.suggest(q, limit == null ? 6 : limit);
        return ResponseEntity.ok().cacheControl(GEO_CACHE_CONTROL).body(result);
    }
}

package com.plura.plurabackend.core.geo;

import com.plura.plurabackend.core.geo.dto.GeoAutocompleteItemResponse;
import com.plura.plurabackend.core.geo.dto.GeoForwardGeocodeResponse;
import com.plura.plurabackend.core.geo.dto.GeoLocationSuggestionResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/geo")
public class GeoController {

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
    public List<GeoAutocompleteItemResponse> autocomplete(
        @RequestParam String q,
        @RequestParam(required = false, defaultValue = "8") Integer limit
    ) {
        return geoAutocompleteRepository.autocomplete(q, limit == null ? 8 : limit);
    }

    @GetMapping("/geocode")
    public GeoForwardGeocodeResponse geocode(@RequestParam String q) {
        return geoForwardGeocodeService.geocode(q);
    }

    @GetMapping("/suggest")
    public List<GeoLocationSuggestionResponse> suggest(
        @RequestParam String q,
        @RequestParam(required = false, defaultValue = "6") Integer limit
    ) {
        return geoForwardGeocodeService.suggest(q, limit == null ? 6 : limit);
    }
}

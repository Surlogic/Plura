package com.plura.plurabackend.geo;

import com.plura.plurabackend.geo.dto.GeoAutocompleteItemResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/geo")
public class GeoController {

    private final GeoAutocompleteRepository geoAutocompleteRepository;

    public GeoController(GeoAutocompleteRepository geoAutocompleteRepository) {
        this.geoAutocompleteRepository = geoAutocompleteRepository;
    }

    @GetMapping("/autocomplete")
    public List<GeoAutocompleteItemResponse> autocomplete(
        @RequestParam String q,
        @RequestParam(required = false, defaultValue = "8") Integer limit
    ) {
        return geoAutocompleteRepository.autocomplete(q, limit == null ? 8 : limit);
    }
}

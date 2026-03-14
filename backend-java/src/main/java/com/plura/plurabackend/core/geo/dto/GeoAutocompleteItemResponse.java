package com.plura.plurabackend.core.geo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GeoAutocompleteItemResponse {
    private String label;
    private String city;
    private Double lat;
    private Double lng;
}

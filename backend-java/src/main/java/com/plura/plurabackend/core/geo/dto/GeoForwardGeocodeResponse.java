package com.plura.plurabackend.core.geo.dto;

public record GeoForwardGeocodeResponse(
    Double latitude,
    Double longitude,
    String placeName
) {}

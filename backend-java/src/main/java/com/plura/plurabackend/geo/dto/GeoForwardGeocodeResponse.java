package com.plura.plurabackend.geo.dto;

public record GeoForwardGeocodeResponse(
    Double latitude,
    Double longitude,
    String placeName
) {}

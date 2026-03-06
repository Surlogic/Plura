package com.plura.plurabackend.geo.dto;

public record GeoLocationSuggestionResponse(
    String country,
    String city,
    String fullAddress,
    Double latitude,
    Double longitude,
    String placeName
) {}

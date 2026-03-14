package com.plura.plurabackend.core.geo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.geo.dto.GeoForwardGeocodeResponse;
import com.plura.plurabackend.core.geo.dto.GeoLocationSuggestionResponse;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class GeoForwardGeocodeService {

    private static final String MAPBOX_GEOCODING_ENDPOINT = "https://api.mapbox.com/geocoding/v5/mapbox.places/";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String mapboxToken;

    public GeoForwardGeocodeService(
        ObjectMapper objectMapper,
        @Value("${app.mapbox.token:}") String mapboxToken
    ) {
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();
        this.objectMapper = objectMapper;
        this.mapboxToken = mapboxToken == null ? "" : mapboxToken.trim();
    }

    public GeoForwardGeocodeResponse geocode(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        if (query.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "q es obligatorio");
        }
        if (mapboxToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Mapbox no configurado");
        }

        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String encodedToken = URLEncoder.encode(mapboxToken, StandardCharsets.UTF_8);
            URI endpoint = URI.create(
                MAPBOX_GEOCODING_ENDPOINT + encodedQuery + ".json"
                    + "?access_token=" + encodedToken
                    + "&limit=1"
                    + "&autocomplete=true"
                    + "&types=address,place,locality,neighborhood"
                    + "&language=es"
                    + "&country=uy,ar"
            );

            HttpRequest request = HttpRequest.newBuilder(endpoint)
                .GET()
                .timeout(Duration.ofSeconds(5))
                .header("Accept", "application/json")
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo geocodificar");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> payload = objectMapper.readValue(response.body(), Map.class);
            Object featuresValue = payload.get("features");
            if (!(featuresValue instanceof List<?> features) || features.isEmpty()) {
                return null;
            }

            Object firstFeature = features.get(0);
            if (!(firstFeature instanceof Map<?, ?> featureMap)) {
                return null;
            }

            Object centerValue = featureMap.get("center");
            if (!(centerValue instanceof List<?> center) || center.size() < 2) {
                return null;
            }

            Double longitude = toDouble(center.get(0));
            Double latitude = toDouble(center.get(1));
            if (latitude == null || longitude == null) {
                return null;
            }

            String placeName = featureMap.get("place_name") instanceof String place
                ? place.trim()
                : query;

            return new GeoForwardGeocodeResponse(latitude, longitude, placeName);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo geocodificar");
        }
    }

    public List<GeoLocationSuggestionResponse> suggest(String rawQuery, int rawLimit) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        if (query.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "q es obligatorio");
        }
        if (mapboxToken.isBlank()) {
            return List.of();
        }

        int limit = Math.max(1, Math.min(rawLimit, 10));
        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String encodedToken = URLEncoder.encode(mapboxToken, StandardCharsets.UTF_8);
            URI endpoint = URI.create(
                MAPBOX_GEOCODING_ENDPOINT + encodedQuery + ".json"
                    + "?access_token=" + encodedToken
                    + "&limit=" + limit
                    + "&autocomplete=true"
                    + "&types=address,place,locality,neighborhood,country"
                    + "&language=es"
                    + "&country=uy,ar"
            );

            HttpRequest request = HttpRequest.newBuilder(endpoint)
                .GET()
                .timeout(Duration.ofSeconds(5))
                .header("Accept", "application/json")
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return List.of();
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> payload = objectMapper.readValue(response.body(), Map.class);
            Object featuresValue = payload.get("features");
            if (!(featuresValue instanceof List<?> features) || features.isEmpty()) {
                return List.of();
            }

            List<GeoLocationSuggestionResponse> suggestions = new ArrayList<>();
            for (Object feature : features) {
                if (!(feature instanceof Map<?, ?> featureMap)) {
                    continue;
                }
                Object centerValue = featureMap.get("center");
                if (!(centerValue instanceof List<?> center) || center.size() < 2) {
                    continue;
                }

                Double longitude = toDouble(center.get(0));
                Double latitude = toDouble(center.get(1));
                if (latitude == null || longitude == null) {
                    continue;
                }

                String placeName = asTrimmedString(featureMap.get("place_name"));
                String featureText = asTrimmedString(featureMap.get("text"));
                String country = contextText(featureMap, "country.");
                String city = firstNonBlank(
                    contextText(featureMap, "place."),
                    contextText(featureMap, "locality."),
                    contextText(featureMap, "region.")
                );
                String fullAddress = firstNonBlank(placeName, featureText);

                if ((country == null || country.isBlank()) && isCountryFeature(featureMap)) {
                    country = featureText;
                }
                if ((city == null || city.isBlank()) && !isCountryFeature(featureMap)) {
                    city = featureText;
                }

                suggestions.add(new GeoLocationSuggestionResponse(
                    country,
                    city,
                    fullAddress,
                    latitude,
                    longitude,
                    firstNonBlank(placeName, fullAddress)
                ));
            }

            return suggestions;
        } catch (Exception exception) {
            return List.of();
        }
    }

    private Double toDouble(Object value) {
        if (value instanceof Number number) {
            double parsed = number.doubleValue();
            return Double.isFinite(parsed) ? parsed : null;
        }
        if (value instanceof String stringValue) {
            try {
                double parsed = Double.parseDouble(stringValue.trim());
                return Double.isFinite(parsed) ? parsed : null;
            } catch (NumberFormatException exception) {
                return null;
            }
        }
        return null;
    }

    private String asTrimmedString(Object value) {
        if (!(value instanceof String stringValue)) {
            return null;
        }
        String trimmed = stringValue.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String contextText(Map<?, ?> featureMap, String contextPrefix) {
        Object contextValue = featureMap.get("context");
        if (!(contextValue instanceof List<?> contextItems)) {
            return null;
        }
        for (Object item : contextItems) {
            if (!(item instanceof Map<?, ?> contextMap)) {
                continue;
            }
            String id = asTrimmedString(contextMap.get("id"));
            if (id == null || !id.startsWith(contextPrefix)) {
                continue;
            }
            String text = asTrimmedString(contextMap.get("text"));
            if (text != null) {
                return text;
            }
        }
        return null;
    }

    private boolean isCountryFeature(Map<?, ?> featureMap) {
        Object placeTypeValue = featureMap.get("place_type");
        if (!(placeTypeValue instanceof List<?> placeTypes)) {
            return false;
        }
        for (Object placeType : placeTypes) {
            if (placeType instanceof String value && "country".equalsIgnoreCase(value.trim())) {
                return true;
            }
        }
        return false;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}

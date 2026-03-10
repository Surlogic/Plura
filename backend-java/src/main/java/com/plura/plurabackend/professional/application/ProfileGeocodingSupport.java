package com.plura.plurabackend.professional.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.professional.dto.ProfesionalBusinessProfileUpdateRequest;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ProfileGeocodingSupport {

    private static final HttpClient MAPBOX_HTTP_CLIENT = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .build();
    private static final String MAPBOX_GEOCODING_ENDPOINT = "https://api.mapbox.com/geocoding/v5/mapbox.places/";

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ObjectMapper objectMapper;
    private final Executor geocodingExecutor;
    private final Set<Long> geocodingInFlight = ConcurrentHashMap.newKeySet();
    private final String mapboxToken;

    public ProfileGeocodingSupport(
        ProfessionalProfileRepository professionalProfileRepository,
        ObjectMapper objectMapper,
        @Qualifier("geocodingExecutor") Executor geocodingExecutor,
        @Value("${app.mapbox.token:}") String mapboxToken
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.objectMapper = objectMapper;
        this.geocodingExecutor = geocodingExecutor;
        this.mapboxToken = mapboxToken == null ? "" : mapboxToken.trim();
    }

    public ProfessionalProfile ensurePublicCoordinates(ProfessionalProfile profile) {
        if (profile == null || (profile.getLatitude() != null && profile.getLongitude() != null)) {
            return profile;
        }

        String location = profile.getLocationText();
        if (location == null || location.isBlank()) {
            location = profile.getLocation();
        }
        if (location == null || location.isBlank() || mapboxToken.isBlank()) {
            return profile;
        }

        Long profileId = profile.getId();
        if (profileId == null || !geocodingInFlight.add(profileId)) {
            return profile;
        }

        final String locationToGeocode = location;
        CompletableFuture.runAsync(() -> {
            try {
                Coordinates coordinates = geocodeLocation(locationToGeocode);
                if (coordinates != null) {
                    professionalProfileRepository.updateCoordinates(profileId, coordinates.latitude(), coordinates.longitude());
                }
            } finally {
                geocodingInFlight.remove(profileId);
            }
        }, geocodingExecutor);
        return profile;
    }

    public boolean hasAnyStructuredLocationInput(ProfesionalBusinessProfileUpdateRequest request) {
        return request.getCountry() != null || request.getCity() != null || request.getFullAddress() != null;
    }

    public String normalizeLocationPart(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    public String composeLocation(String fullAddress, String city, String country) {
        return String.join(", ", fullAddress.trim(), city.trim(), country.trim());
    }

    public void validateCoordinatesPair(Double latitude, Double longitude) {
        if ((latitude == null) == (longitude == null)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "latitude y longitude deben enviarse juntas");
    }

    public Double normalizeLatitude(Double rawLatitude) {
        if (rawLatitude == null) {
            return null;
        }
        if (rawLatitude < -90d || rawLatitude > 90d) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "latitude fuera de rango");
        }
        return rawLatitude;
    }

    public Double normalizeLongitude(Double rawLongitude) {
        if (rawLongitude == null) {
            return null;
        }
        if (rawLongitude < -180d || rawLongitude > 180d) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "longitude fuera de rango");
        }
        return rawLongitude;
    }

    private Coordinates geocodeLocation(String rawLocation) {
        try {
            String encodedLocation = URLEncoder.encode(rawLocation.trim(), StandardCharsets.UTF_8);
            String encodedToken = URLEncoder.encode(mapboxToken, StandardCharsets.UTF_8);
            URI endpoint = URI.create(
                MAPBOX_GEOCODING_ENDPOINT + encodedLocation + ".json"
                    + "?access_token=" + encodedToken
                    + "&limit=1&autocomplete=true&types=address,place,locality,neighborhood&language=es&country=uy,ar"
            );

            HttpRequest request = HttpRequest.newBuilder(endpoint)
                .GET()
                .timeout(Duration.ofSeconds(5))
                .header("Accept", "application/json")
                .build();
            HttpResponse<String> response = MAPBOX_HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return null;
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
            if (latitude < -90d || latitude > 90d || longitude < -180d || longitude > 180d) {
                return null;
            }
            return new Coordinates(latitude, longitude);
        } catch (Exception exception) {
            return null;
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

    private record Coordinates(Double latitude, Double longitude) {}
}

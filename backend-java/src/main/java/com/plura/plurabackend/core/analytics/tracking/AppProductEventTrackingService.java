package com.plura.plurabackend.core.analytics.tracking;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.analytics.tracking.model.AppProductEvent;
import com.plura.plurabackend.core.analytics.tracking.repository.AppProductEventRepository;
import com.plura.plurabackend.core.category.dto.CategoryResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AppProductEventTrackingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AppProductEventTrackingService.class);
    private static final String EVENT_SEARCH_PERFORMED = "SEARCH_PERFORMED";
    private static final String EVENT_PROFESSIONAL_PROFILE_VIEWED = "PROFESSIONAL_PROFILE_VIEWED";

    private final AppProductEventRepository appProductEventRepository;
    private final ObjectMapper objectMapper;

    public AppProductEventTrackingService(
        AppProductEventRepository appProductEventRepository,
        ObjectMapper objectMapper
    ) {
        this.appProductEventRepository = appProductEventRepository;
        this.objectMapper = objectMapper;
    }

    public void trackSearch(
        String platform,
        String type,
        String query,
        String categorySlug,
        String city,
        Double lat,
        Double lng,
        Double radiusKm,
        LocalDate date,
        LocalDate from,
        LocalDate to,
        boolean availableNow,
        Integer page,
        Integer size,
        String sort,
        long resultCount
    ) {
        if (page != null && page > 0) {
            return;
        }

        String normalizedQuery = normalizeOptional(query);
        String normalizedType = normalizeOptional(type);
        String resolvedCategorySlug = normalizeOptional(categorySlug);
        String resolvedCategoryLabel = resolvedCategorySlug;

        if (resolvedCategorySlug == null
            && normalizedQuery != null
            && "RUBRO".equalsIgnoreCase(normalizedType)) {
            resolvedCategorySlug = slugify(normalizedQuery);
            resolvedCategoryLabel = normalizedQuery;
        }

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("lat", lat);
        metadata.put("lng", lng);
        metadata.put("radiusKm", radiusKm);
        metadata.put("date", date == null ? null : date.toString());
        metadata.put("from", from == null ? null : from.toString());
        metadata.put("to", to == null ? null : to.toString());
        metadata.put("availableNow", availableNow);
        metadata.put("size", size);
        metadata.put("sort", normalizeOptional(sort));

        persistSafely(newEvent(EVENT_SEARCH_PERFORMED, platform)
            .withSourceSurface("marketplace")
            .withSearchType(normalizedType)
            .withQueryText(normalizedQuery)
            .withCategorySlug(resolvedCategorySlug)
            .withCategoryLabel(resolveCategoryLabel(resolvedCategoryLabel))
            .withCity(normalizeOptional(city))
            .withResultCount(safeResultCount(resultCount))
            .withMetadataJson(writeMetadata(metadata))
            .build());
    }

    public void trackProfessionalProfileView(
        String platform,
        ProfesionalPublicPageResponse response
    ) {
        if (response == null) {
            return;
        }

        CategoryResponse primaryCategory = response.getCategories() == null || response.getCategories().isEmpty()
            ? null
            : response.getCategories().get(0);
        String categorySlug = primaryCategory == null ? null : normalizeOptional(primaryCategory.getSlug());
        String categoryLabel = primaryCategory == null ? null : normalizeOptional(primaryCategory.getName());
        if (categoryLabel == null) {
            categoryLabel = normalizeOptional(response.getRubro());
        }

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("rating", response.getRating());
        metadata.put("reviewsCount", response.getReviewsCount());
        metadata.put("servicesCount", response.getServices() == null ? 0 : response.getServices().size());

        persistSafely(newEvent(EVENT_PROFESSIONAL_PROFILE_VIEWED, platform)
            .withSourceSurface("public_profile")
            .withCategorySlug(categorySlug)
            .withCategoryLabel(resolveCategoryLabel(categoryLabel))
            .withProfessionalId(parseLong(response.getId()))
            .withProfessionalSlug(normalizeOptional(response.getSlug()))
            .withProfessionalRubro(normalizeOptional(response.getRubro()))
            .withCity(normalizeOptional(response.getCity()))
            .withCountry(normalizeOptional(response.getCountry()))
            .withResultCount(1)
            .withMetadataJson(writeMetadata(metadata))
            .build());
    }

    private AppProductEventBuilder newEvent(String eventKey, String platform) {
        return new AppProductEventBuilder()
            .withEventKey(eventKey)
            .withPlatform(normalizePlatform(platform));
    }

    private void persistSafely(AppProductEvent event) {
        if (event == null) {
            return;
        }
        try {
            appProductEventRepository.save(event);
        } catch (Exception exception) {
            LOGGER.warn("No se pudo persistir analytics event {}", event.getEventKey(), exception);
        }
    }

    private Integer safeResultCount(long resultCount) {
        if (resultCount <= 0) {
            return 0;
        }
        return resultCount > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) resultCount;
    }

    private String normalizePlatform(String platform) {
        String normalized = normalizeOptional(platform);
        if (normalized == null) {
            return "UNKNOWN";
        }
        String upper = normalized.toUpperCase(Locale.ROOT);
        return switch (upper) {
            case "WEB", "MOBILE", "INTERNAL" -> upper;
            default -> "UNKNOWN";
        };
    }

    private String resolveCategoryLabel(String value) {
        String normalized = normalizeOptional(value);
        return normalized == null ? "Sin categoria" : normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(value.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String slugify(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-|-$)", "");
        return normalized.isBlank() ? null : normalized;
    }

    private String writeMetadata(Map<String, Object> metadata) {
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException exception) {
            return "{}";
        }
    }

    private static final class AppProductEventBuilder {
        private final AppProductEvent event = new AppProductEvent();

        AppProductEventBuilder withEventKey(String value) {
            event.setEventKey(value);
            return this;
        }

        AppProductEventBuilder withPlatform(String value) {
            event.setPlatform(value);
            return this;
        }

        AppProductEventBuilder withSourceSurface(String value) {
            event.setSourceSurface(value);
            return this;
        }

        AppProductEventBuilder withSearchType(String value) {
            event.setSearchType(value);
            return this;
        }

        AppProductEventBuilder withQueryText(String value) {
            event.setQueryText(value);
            return this;
        }

        AppProductEventBuilder withCategorySlug(String value) {
            event.setCategorySlug(value);
            return this;
        }

        AppProductEventBuilder withCategoryLabel(String value) {
            event.setCategoryLabel(value);
            return this;
        }

        AppProductEventBuilder withProfessionalId(Long value) {
            event.setProfessionalId(value);
            return this;
        }

        AppProductEventBuilder withProfessionalSlug(String value) {
            event.setProfessionalSlug(value);
            return this;
        }

        AppProductEventBuilder withProfessionalRubro(String value) {
            event.setProfessionalRubro(value);
            return this;
        }

        AppProductEventBuilder withCity(String value) {
            event.setCity(value);
            return this;
        }

        AppProductEventBuilder withCountry(String value) {
            event.setCountry(value);
            return this;
        }

        AppProductEventBuilder withResultCount(Integer value) {
            event.setResultCount(value);
            return this;
        }

        AppProductEventBuilder withMetadataJson(String value) {
            event.setMetadataJson(value);
            return this;
        }

        AppProductEvent build() {
            return event;
        }
    }
}

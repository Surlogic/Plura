package com.plura.plurabackend.core.analytics.tracking;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.analytics.tracking.dto.PublicProductAnalyticsEventRequest;
import com.plura.plurabackend.core.analytics.tracking.model.AppProductEvent;
import com.plura.plurabackend.core.analytics.tracking.repository.AppProductEventRepository;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.category.dto.CategoryResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AppProductEventTrackingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AppProductEventTrackingService.class);

    public static final String ANALYTICS_SESSION_HEADER = "X-Plura-Analytics-Session-Id";

    public static final String EVENT_SEARCH_PERFORMED = "SEARCH_PERFORMED";
    public static final String EVENT_PROFESSIONAL_PROFILE_VIEWED = "PROFESSIONAL_PROFILE_VIEWED";
    public static final String EVENT_RESERVATION_STEP_VIEWED = "RESERVATION_STEP_VIEWED";
    public static final String EVENT_RESERVATION_SERVICE_CONFIRMED = "RESERVATION_SERVICE_CONFIRMED";
    public static final String EVENT_RESERVATION_DATE_CONFIRMED = "RESERVATION_DATE_CONFIRMED";
    public static final String EVENT_RESERVATION_TIME_SELECTED = "RESERVATION_TIME_SELECTED";
    public static final String EVENT_RESERVATION_AUTH_OPENED = "RESERVATION_AUTH_OPENED";
    public static final String EVENT_RESERVATION_AUTH_COMPLETED = "RESERVATION_AUTH_COMPLETED";
    public static final String EVENT_RESERVATION_SUBMIT_ATTEMPTED = "RESERVATION_SUBMIT_ATTEMPTED";
    public static final String EVENT_PAYMENT_CHECKOUT_BLOCKED = "PAYMENT_CHECKOUT_BLOCKED";
    public static final String EVENT_BOOKING_CREATED = "BOOKING_CREATED";
    public static final String EVENT_BOOKING_CONFIRMED = "BOOKING_CONFIRMED";
    public static final String EVENT_BOOKING_CANCELLED = "BOOKING_CANCELLED";
    public static final String EVENT_BOOKING_RESCHEDULED = "BOOKING_RESCHEDULED";
    public static final String EVENT_BOOKING_COMPLETED = "BOOKING_COMPLETED";
    public static final String EVENT_BOOKING_NO_SHOW = "BOOKING_NO_SHOW";
    public static final String EVENT_PAYMENT_SESSION_CREATED = "PAYMENT_SESSION_CREATED";

    private static final Set<String> PUBLIC_EVENT_KEYS = Set.of(
        EVENT_RESERVATION_STEP_VIEWED,
        EVENT_RESERVATION_SERVICE_CONFIRMED,
        EVENT_RESERVATION_DATE_CONFIRMED,
        EVENT_RESERVATION_TIME_SELECTED,
        EVENT_RESERVATION_AUTH_OPENED,
        EVENT_RESERVATION_AUTH_COMPLETED,
        EVENT_RESERVATION_SUBMIT_ATTEMPTED,
        EVENT_PAYMENT_CHECKOUT_BLOCKED
    );

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
        String sessionId,
        Long userId,
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
            .withSessionId(normalizeSessionId(sessionId))
            .withUserId(userId)
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
        String sessionId,
        Long userId,
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
            .withSessionId(normalizeSessionId(sessionId))
            .withUserId(userId)
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

    public void trackPublicProductEvent(
        String platform,
        String sessionId,
        Long userId,
        PublicProductAnalyticsEventRequest request
    ) {
        if (request == null) {
            return;
        }
        String eventKey = normalizeOptional(request.eventKey());
        if (eventKey == null || !PUBLIC_EVENT_KEYS.contains(eventKey)) {
            return;
        }

        String categoryLabel = firstNonBlank(request.categoryLabel(), request.professionalRubro());
        persistSafely(newEvent(eventKey, platform)
            .withSourceSurface(firstNonBlank(request.sourceSurface(), "reservation_flow"))
            .withSessionId(normalizeSessionId(sessionId))
            .withUserId(userId)
            .withStepName(normalizeStepName(request.stepName()))
            .withProfessionalId(request.professionalId())
            .withProfessionalSlug(normalizeOptional(request.professionalSlug()))
            .withProfessionalRubro(normalizeOptional(request.professionalRubro()))
            .withCategorySlug(normalizeOptional(request.categorySlug()))
            .withCategoryLabel(resolveCategoryLabel(categoryLabel))
            .withServiceId(normalizeOptional(request.serviceId()))
            .withBookingId(request.bookingId())
            .withCity(normalizeOptional(request.city()))
            .withCountry(normalizeOptional(request.country()))
            .withResultCount(1)
            .withMetadataJson(writeMetadata(request.metadata()))
            .build());
    }

    public void trackBookingCreated(
        String platform,
        String sessionId,
        Booking booking
    ) {
        trackBookingLifecycleEvent(
            EVENT_BOOKING_CREATED,
            platform,
            sessionId,
            booking,
            null,
            Map.of("source", "booking_creation")
        );
    }

    public void trackPaymentSessionCreated(
        Booking booking,
        PaymentTransaction transaction,
        String outcomeCode,
        boolean hasCheckoutUrl
    ) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("outcomeCode", normalizeOptional(outcomeCode));
        metadata.put("hasCheckoutUrl", hasCheckoutUrl);
        if (transaction != null) {
            metadata.put("paymentTransactionId", transaction.getId());
            metadata.put("paymentProvider", transaction.getProvider() == null ? null : transaction.getProvider().name());
            metadata.put("transactionStatus", transaction.getStatus() == null ? null : transaction.getStatus().name());
        }
        trackBookingLifecycleEvent(
            EVENT_PAYMENT_SESSION_CREATED,
            booking == null ? null : booking.getSourcePlatformSnapshot(),
            null,
            booking,
            null,
            metadata
        );
    }

    public void trackBookingConfirmed(
        Booking booking,
        BookingActorType actorType,
        Long actorUserId,
        Map<String, Object> metadata
    ) {
        trackBookingLifecycleEvent(
            EVENT_BOOKING_CONFIRMED,
            booking == null ? null : booking.getSourcePlatformSnapshot(),
            null,
            booking,
            actorUserId,
            enrichActorMetadata(metadata, actorType, actorUserId)
        );
    }

    public void trackBookingCancelled(
        Booking booking,
        BookingActorType actorType,
        Long actorUserId,
        Map<String, Object> metadata
    ) {
        trackBookingLifecycleEvent(
            EVENT_BOOKING_CANCELLED,
            booking == null ? null : booking.getSourcePlatformSnapshot(),
            null,
            booking,
            actorUserId,
            enrichActorMetadata(metadata, actorType, actorUserId)
        );
    }

    public void trackBookingRescheduled(
        Booking booking,
        BookingActorType actorType,
        Long actorUserId,
        Map<String, Object> metadata
    ) {
        trackBookingLifecycleEvent(
            EVENT_BOOKING_RESCHEDULED,
            booking == null ? null : booking.getSourcePlatformSnapshot(),
            null,
            booking,
            actorUserId,
            enrichActorMetadata(metadata, actorType, actorUserId)
        );
    }

    public void trackBookingCompleted(
        Booking booking,
        BookingActorType actorType,
        Long actorUserId,
        Map<String, Object> metadata
    ) {
        trackBookingLifecycleEvent(
            EVENT_BOOKING_COMPLETED,
            booking == null ? null : booking.getSourcePlatformSnapshot(),
            null,
            booking,
            actorUserId,
            enrichActorMetadata(metadata, actorType, actorUserId)
        );
    }

    public void trackBookingNoShow(
        Booking booking,
        BookingActorType actorType,
        Long actorUserId,
        Map<String, Object> metadata
    ) {
        trackBookingLifecycleEvent(
            EVENT_BOOKING_NO_SHOW,
            booking == null ? null : booking.getSourcePlatformSnapshot(),
            null,
            booking,
            actorUserId,
            enrichActorMetadata(metadata, actorType, actorUserId)
        );
    }

    private void trackBookingLifecycleEvent(
        String eventKey,
        String platform,
        String sessionId,
        Booking booking,
        Long userId,
        Map<String, Object> metadata
    ) {
        if (booking == null) {
            return;
        }

        Map<String, Object> payload = bookingMetadata(booking);
        if (metadata != null && !metadata.isEmpty()) {
            payload.putAll(metadata);
        }

        persistSafely(newEvent(eventKey, platform)
            .withSourceSurface("booking_lifecycle")
            .withSessionId(normalizeSessionId(sessionId))
            .withUserId(resolveBookingUserId(booking, userId))
            .withProfessionalId(booking.getProfessionalId())
            .withProfessionalSlug(normalizeOptional(booking.getProfessionalSlugSnapshot()))
            .withProfessionalRubro(normalizeOptional(booking.getProfessionalRubroSnapshot()))
            .withCategorySlug(normalizeOptional(booking.getServiceCategorySlugSnapshot()))
            .withCategoryLabel(resolveCategoryLabel(firstNonBlank(
                booking.getServiceCategoryNameSnapshot(),
                booking.getProfessionalRubroSnapshot()
            )))
            .withServiceId(normalizeOptional(booking.getServiceId()))
            .withBookingId(booking.getId())
            .withCity(normalizeOptional(booking.getProfessionalCitySnapshot()))
            .withCountry(normalizeOptional(booking.getProfessionalCountrySnapshot()))
            .withResultCount(1)
            .withMetadataJson(writeMetadata(payload))
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

    private Long resolveBookingUserId(Booking booking, Long fallbackUserId) {
        if (booking != null && booking.getUser() != null && booking.getUser().getId() != null) {
            return booking.getUser().getId();
        }
        return fallbackUserId;
    }

    private Map<String, Object> bookingMetadata(Booking booking) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        if (booking == null) {
            return metadata;
        }
        metadata.put("bookingStatus", booking.getOperationalStatus() == null ? null : booking.getOperationalStatus().name());
        metadata.put("paymentType", booking.getServicePaymentTypeSnapshot() == null
            ? ServicePaymentType.ON_SITE.name()
            : booking.getServicePaymentTypeSnapshot().name());
        metadata.put("price", booking.getServicePriceSnapshot());
        metadata.put("currency", booking.getServiceCurrencySnapshot());
        metadata.put("sourcePlatform", normalizePlatform(booking.getSourcePlatformSnapshot()));
        metadata.put("rescheduleCount", booking.getRescheduleCount());
        metadata.put("bookingStartDateTime", booking.getStartDateTime() == null ? null : booking.getStartDateTime().toString());
        return metadata;
    }

    private Map<String, Object> enrichActorMetadata(
        Map<String, Object> metadata,
        BookingActorType actorType,
        Long actorUserId
    ) {
        Map<String, Object> enriched = new LinkedHashMap<>();
        if (metadata != null && !metadata.isEmpty()) {
            enriched.putAll(metadata);
        }
        if (actorType != null) {
            enriched.put("actorType", actorType.name());
        }
        if (actorUserId != null) {
            enriched.put("actorUserId", actorUserId);
        }
        return enriched;
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

    private String normalizeSessionId(String value) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            return null;
        }
        return normalized.length() <= 120 ? normalized : normalized.substring(0, 120);
    }

    private String normalizeStepName(String value) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            return null;
        }
        return normalized.length() <= 60 ? normalized : normalized.substring(0, 60);
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

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            String normalized = normalizeOptional(value);
            if (normalized != null) {
                return normalized;
            }
        }
        return null;
    }

    private String writeMetadata(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return "{}";
        }
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

        AppProductEventBuilder withServiceId(String value) {
            event.setServiceId(value);
            return this;
        }

        AppProductEventBuilder withBookingId(Long value) {
            event.setBookingId(value);
            return this;
        }

        AppProductEventBuilder withUserId(Long value) {
            event.setUserId(value);
            return this;
        }

        AppProductEventBuilder withSessionId(String value) {
            event.setSessionId(value);
            return this;
        }

        AppProductEventBuilder withStepName(String value) {
            event.setStepName(value);
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

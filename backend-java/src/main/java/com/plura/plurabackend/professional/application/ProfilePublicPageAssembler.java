package com.plura.plurabackend.professional.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.booking.dto.BookingPolicySnapshotResponse;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.core.storage.ImageStorageService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.professional.dto.MediaPresentationDto;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.photo.model.BusinessPhoto;
import com.plura.plurabackend.professional.photo.model.BusinessPhotoType;
import com.plura.plurabackend.professional.photo.repository.BusinessPhotoRepository;
import com.plura.plurabackend.professional.profile.ProfessionalCategorySupport;
import com.plura.plurabackend.professional.schedule.ProfessionalScheduleSupport;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class ProfilePublicPageAssembler {

    private static final int DEFAULT_SLOT_DURATION_MINUTES = 15;
    private static final Set<Integer> ALLOWED_SLOT_DURATIONS = Set.of(10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60);

    private final BusinessPhotoRepository businessPhotoRepository;
    private final ProfessionalCategorySupport categorySupport;
    private final ProfesionalServiceRepository profesionalServiceRepository;
    private final BookingPolicySnapshotService bookingPolicySnapshotService;
    private final ImageStorageService imageStorageService;
    private final ObjectMapper objectMapper;

    public ProfilePublicPageAssembler(
        BusinessPhotoRepository businessPhotoRepository,
        ProfessionalCategorySupport categorySupport,
        ProfesionalServiceRepository profesionalServiceRepository,
        BookingPolicySnapshotService bookingPolicySnapshotService,
        ImageStorageService imageStorageService,
        ObjectMapper objectMapper
    ) {
        this.businessPhotoRepository = businessPhotoRepository;
        this.categorySupport = categorySupport;
        this.profesionalServiceRepository = profesionalServiceRepository;
        this.bookingPolicySnapshotService = bookingPolicySnapshotService;
        this.imageStorageService = imageStorageService;
        this.objectMapper = objectMapper;
    }

    public ProfesionalPublicPageResponse toPublicPage(ProfessionalProfile profile) {
        User user = profile.getUser();
        ProfesionalScheduleDto schedule = readStoredSchedule(profile.getScheduleJson());
        schedule.setSlotDurationMinutes(resolveSlotDurationMinutes(profile.getSlotDurationMinutes()));
        List<ProfesionalServiceResponse> services = profesionalServiceRepository
            .findByProfessional_IdOrderByCreatedAtDesc(profile.getId())
            .stream()
            .filter(service -> !Boolean.FALSE.equals(service.getActive()))
            .map(this::toPublicServiceResponse)
            .toList();
        BookingPolicySnapshotResponse publicBookingPolicy = bookingPolicySnapshotService.toResponse(
            bookingPolicySnapshotService.buildForProfessionalId(profile.getId())
        );

        return ProfesionalPublicPageResponse.builder()
            .id(String.valueOf(profile.getId()))
            .slug(profile.getSlug())
            .name(user.getFullName())
            .fullName(user.getFullName())
            .rubro(categorySupport.resolvePrimaryRubro(profile))
            .description(profile.getPublicAbout())
            .headline(profile.getPublicHeadline())
            .about(profile.getPublicAbout())
            .logoUrl(normalizePublicPhotoUrl(profile.getLogoUrl()))
            .logoMedia(toMediaPresentation(
                profile.getLogoPositionX(),
                profile.getLogoPositionY(),
                profile.getLogoZoom()
            ))
            .bannerUrl(normalizePublicPhotoUrl(profile.getBannerUrl()))
            .bannerMedia(toMediaPresentation(
                profile.getBannerPositionX(),
                profile.getBannerPositionY(),
                profile.getBannerZoom()
            ))
            .address(profile.getFullAddress() == null ? profile.getLocation() : profile.getFullAddress())
            .location(profile.getLocation())
            .country(profile.getCountry())
            .city(profile.getCity())
            .fullAddress(profile.getFullAddress())
            .lat(profile.getLatitude())
            .lng(profile.getLongitude())
            .latitude(profile.getLatitude())
            .longitude(profile.getLongitude())
            .email(normalizeOptional(user.getEmail()))
            .phone(normalizeOptional(user.getPhoneNumber()))
            .phoneNumber(normalizeOptional(user.getPhoneNumber()))
            .instagram(normalizeOptional(profile.getInstagram()))
            .facebook(normalizeOptional(profile.getFacebook()))
            .tiktok(normalizeOptional(profile.getTiktok()))
            .website(normalizeOptional(profile.getWebsite()))
            .whatsapp(normalizeOptional(profile.getWhatsapp()))
            .categories(categorySupport.mapCategories(profile.getCategories()))
            .photos(resolvePublicGalleryPhotos(profile, services))
            .schedule(schedule)
            .services(services)
            .bookingPolicy(publicBookingPolicy)
            .rating(profile.getRating())
            .reviewsCount(profile.getReviewsCount())
            .build();
    }

    public ProfesionalPublicSummaryResponse toSummary(ProfessionalProfile profile) {
        return new ProfesionalPublicSummaryResponse(
            String.valueOf(profile.getId()),
            profile.getSlug(),
            profile.getUser().getFullName(),
            categorySupport.resolvePrimaryRubro(profile),
            profile.getLocation(),
            profile.getPublicHeadline(),
            categorySupport.mapCategories(profile.getCategories()),
            normalizePublicPhotoUrl(profile.getLogoUrl()),
            profile.getRating(),
            profile.getReviewsCount()
        );
    }

    private MediaPresentationDto toMediaPresentation(Double positionX, Double positionY, Double zoom) {
        return new MediaPresentationDto(
            positionX != null ? positionX : 50d,
            positionY != null ? positionY : 50d,
            zoom != null ? zoom : 1d
        );
    }

    public ProfesionalServiceResponse toServiceResponse(ProfesionalService service) {
        return new ProfesionalServiceResponse(
            service.getId(),
            service.getName(),
            service.getDescription(),
            resolveServiceCategorySlug(service),
            resolveServiceCategoryName(service),
            service.getPrice(),
            service.getDepositAmount(),
            resolveServiceCurrency(service.getCurrency()),
            service.getDuration(),
            normalizePublicPhotoUrl(service.getImageUrl()),
            resolvePostBufferMinutes(service),
            resolveServicePaymentType(service.getPaymentType()),
            service.getActive()
        );
    }

    public ProfesionalServiceResponse toPublicServiceResponse(ProfesionalService service) {
        return new ProfesionalServiceResponse(
            service.getId(),
            service.getName(),
            service.getDescription(),
            resolveServiceCategorySlug(service),
            resolveServiceCategoryName(service),
            service.getPrice(),
            service.getDepositAmount(),
            resolveServiceCurrency(service.getCurrency()),
            service.getDuration(),
            normalizePublicPhotoUrl(service.getImageUrl()),
            null,
            resolveServicePaymentType(service.getPaymentType()),
            service.getActive()
        );
    }

    private ProfesionalScheduleDto readStoredSchedule(String rawScheduleJson) {
        return ProfessionalScheduleSupport.readStoredSchedule(
            objectMapper,
            rawScheduleJson,
            DEFAULT_SLOT_DURATION_MINUTES,
            this::normalizeSlotDurationOrDefault
        );
    }

    private List<String> resolvePublicGalleryPhotos(
        ProfessionalProfile profile,
        List<ProfesionalServiceResponse> services
    ) {
        LinkedHashSet<String> photoUrls = new LinkedHashSet<>();
        List<BusinessPhotoType> businessGalleryTypes = List.of(BusinessPhotoType.LOCAL, BusinessPhotoType.WORK);
        businessPhotoRepository.findByProfessional_IdAndTypeInOrderByCreatedAtAsc(profile.getId(), businessGalleryTypes).stream()
            .map(BusinessPhoto::getUrl)
            .map(this::normalizePublicPhotoUrl)
            .filter(photo -> photo != null)
            .forEach(photoUrls::add);

        if (photoUrls.isEmpty()) {
            profile.getPublicPhotos().stream()
                .map(this::normalizePublicPhotoUrl)
                .filter(photo -> photo != null)
                .forEach(photoUrls::add);
        }

        businessPhotoRepository.findByProfessional_IdAndTypeInOrderByCreatedAtAsc(
            profile.getId(),
            List.of(BusinessPhotoType.SERVICE)
        ).stream()
            .map(BusinessPhoto::getUrl)
            .map(this::normalizePublicPhotoUrl)
            .filter(photo -> photo != null)
            .forEach(photoUrls::add);

        services.stream()
            .map(ProfesionalServiceResponse::getImageUrl)
            .map(this::normalizePublicPhotoUrl)
            .filter(photo -> photo != null)
            .forEach(photoUrls::add);

        return List.copyOf(photoUrls);
    }

    private String normalizePublicPhotoUrl(String rawUrl) {
        if (rawUrl == null) {
            return null;
        }
        String cleaned = rawUrl.trim();
        if (cleaned.isBlank()) {
            return null;
        }
        return imageStorageService.resolvePublicUrl(cleaned);
    }

    private int normalizeSlotDurationOrDefault(Integer value) {
        if (value == null || !ALLOWED_SLOT_DURATIONS.contains(value)) {
            return DEFAULT_SLOT_DURATION_MINUTES;
        }
        return value;
    }

    private int resolveSlotDurationMinutes(Integer value) {
        return normalizeSlotDurationOrDefault(value);
    }

    private int resolvePostBufferMinutes(ProfesionalService service) {
        if (service == null || service.getPostBufferMinutes() == null || service.getPostBufferMinutes() < 0) {
            return 0;
        }
        return service.getPostBufferMinutes();
    }

    private com.plura.plurabackend.core.booking.model.ServicePaymentType resolveServicePaymentType(
        com.plura.plurabackend.core.booking.model.ServicePaymentType paymentType
    ) {
        return paymentType == null ? com.plura.plurabackend.core.booking.model.ServicePaymentType.ON_SITE : paymentType;
    }

    private String resolveServiceCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return "UYU";
        }
        return currency.trim().toUpperCase(java.util.Locale.ROOT);
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String resolveServiceCategorySlug(ProfesionalService service) {
        if (service == null || service.getCategory() == null) {
            return null;
        }
        return normalizeOptional(service.getCategory().getSlug());
    }

    private String resolveServiceCategoryName(ProfesionalService service) {
        if (service == null || service.getCategory() == null) {
            return null;
        }
        return normalizeOptional(service.getCategory().getName());
    }
}

package com.plura.plurabackend.professional.profile;

import com.plura.plurabackend.core.booking.bridge.BookingClientProfessionalView;
import com.plura.plurabackend.core.booking.bridge.BookingClientProfessionalViewGateway;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.category.model.Category;
import com.plura.plurabackend.core.common.util.SlugUtils;
import com.plura.plurabackend.core.professional.ProfessionalHomeGateway;
import com.plura.plurabackend.core.professional.ProfessionalHomeProfileView;
import com.plura.plurabackend.core.professional.ProfessionalSearchIndexGateway;
import com.plura.plurabackend.core.professional.ProfessionalSearchIndexProfileView;
import com.plura.plurabackend.professional.dto.MediaPresentationDto;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.photo.model.BusinessPhoto;
import com.plura.plurabackend.professional.photo.model.BusinessPhotoType;
import com.plura.plurabackend.professional.photo.repository.BusinessPhotoRepository;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class ProfessionalCoreReadGatewayService implements
    ProfessionalHomeGateway,
    ProfessionalSearchIndexGateway,
    BookingClientProfessionalViewGateway {

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfesionalServiceRepository profesionalServiceRepository;
    private final BusinessPhotoRepository businessPhotoRepository;

    public ProfessionalCoreReadGatewayService(
        ProfessionalProfileRepository professionalProfileRepository,
        ProfesionalServiceRepository profesionalServiceRepository,
        BusinessPhotoRepository businessPhotoRepository
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
        this.businessPhotoRepository = businessPhotoRepository;
    }

    @Override
    public long countActiveProfessionals() {
        return professionalProfileRepository.countByActiveTrue();
    }

    @Override
    public List<ProfessionalHomeProfileView> findTopActiveProfilesByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<ProfessionalProfile> profiles = professionalProfileRepository.findByIdInAndActiveTrueWithRelations(ids);
        Map<Long, String> fallbackPhotoByProfessionalId = resolveFallbackPhotoUrls(profiles);
        Map<Long, ProfessionalProfile> byId = profiles.stream()
            .collect(LinkedHashMap::new, (map, profile) -> map.put(profile.getId(), profile), Map::putAll);
        return ids.stream()
            .map(byId::get)
            .filter(Objects::nonNull)
            .map(profile -> toHomeProfileView(profile, fallbackPhotoByProfessionalId.get(profile.getId())))
            .toList();
    }

    @Override
    public List<ProfessionalHomeProfileView> findRecentActiveProfiles(int page, int size) {
        List<ProfessionalProfile> profiles = professionalProfileRepository.findByActiveTrueWithRelationsOrderByCreatedAtDesc(
            PageRequest.of(Math.max(0, page), Math.max(1, size))
        );
        Map<Long, String> fallbackPhotoByProfessionalId = resolveFallbackPhotoUrls(profiles);
        return profiles.stream()
            .map(profile -> toHomeProfileView(profile, fallbackPhotoByProfessionalId.get(profile.getId())))
            .toList();
    }

    @Override
    public List<ProfessionalSearchIndexProfileView> findActiveProfilesByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return professionalProfileRepository.findByIdInAndActiveTrueWithRelations(ids)
            .stream()
            .map(this::toSearchProfileView)
            .toList();
    }

    @Override
    public List<ProfessionalSearchIndexProfileView> findActiveProfilesPage(int page, int size) {
        return professionalProfileRepository.findByActiveTrueWithRelationsOrderByCreatedAtDesc(
                PageRequest.of(Math.max(0, page), Math.max(1, size))
            ).stream()
            .map(this::toSearchProfileView)
            .toList();
    }

    @Override
    public Map<Long, List<String>> findActiveServiceNamesByProfessionalIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        return profesionalServiceRepository.findByProfessional_IdInAndActiveTrueOrderByCreatedAtDesc(ids)
            .stream()
            .filter(service -> service.getProfessional() != null && service.getProfessional().getId() != null)
            .collect(
                Collectors.groupingBy(
                    service -> service.getProfessional().getId(),
                    LinkedHashMap::new,
                    Collectors.mapping(ProfesionalService::getName, Collectors.toList())
                )
            );
    }

    @Override
    public BookingClientProfessionalView resolveView(Booking booking) {
        if (booking == null) {
            return new BookingClientProfessionalView(null, null, null, null);
        }
        return new BookingClientProfessionalView(
            booking.getServiceId(),
            booking.getProfessionalDisplayNameSnapshot(),
            booking.getProfessionalSlugSnapshot(),
            booking.getProfessionalLocationSnapshot()
        );
    }

    private ProfessionalHomeProfileView toHomeProfileView(
        ProfessionalProfile profile,
        String fallbackPhotoUrl
    ) {
        String displayName = profile.getUser() == null ? profile.getDisplayName() : profile.getUser().getFullName();
        String slug = profile.getSlug();
        if (slug == null || slug.isBlank()) {
            slug = SlugUtils.toSlug(displayName == null ? "profesional" : displayName);
        }
        String normalizedBannerUrl = normalizeOptionalUrl(profile.getBannerUrl());
        String normalizedLogoUrl = normalizeOptionalUrl(profile.getLogoUrl());
        String normalizedFallbackPhotoUrl = normalizeOptionalUrl(fallbackPhotoUrl);
        return new ProfessionalHomeProfileView(
            profile.getId(),
            slug,
            displayName,
            resolvePrimaryCategoryName(profile),
            profile.getRating(),
            profile.getReviewsCount(),
            normalizedBannerUrl != null ? normalizedBannerUrl : normalizedFallbackPhotoUrl,
            normalizedBannerUrl,
            toMediaPresentation(profile.getBannerPositionX(), profile.getBannerPositionY(), profile.getBannerZoom()),
            normalizedLogoUrl,
            toMediaPresentation(profile.getLogoPositionX(), profile.getLogoPositionY(), profile.getLogoZoom()),
            normalizedFallbackPhotoUrl
        );
    }

    private ProfessionalSearchIndexProfileView toSearchProfileView(ProfessionalProfile profile) {
        String displayName = profile.getDisplayName();
        if ((displayName == null || displayName.isBlank()) && profile.getUser() != null) {
            displayName = profile.getUser().getFullName();
        }

        List<String> categorySlugs = profile.getCategories() == null
            ? List.of()
            : profile.getCategories().stream()
                .map(Category::getSlug)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(slug -> !slug.isBlank())
                .toList();

        return new ProfessionalSearchIndexProfileView(
            profile.getId(),
            profile.getSlug(),
            displayName,
            profile.getPublicHeadline(),
            profile.getLocationText() == null ? profile.getLocation() : profile.getLocationText(),
            categorySlugs,
            profile.getRating(),
            profile.getLatitude(),
            profile.getLongitude(),
            profile.getHasAvailabilityToday()
        );
    }

    private String resolvePrimaryCategoryName(ProfessionalProfile profile) {
        Set<Category> categories = profile.getCategories();
        if (categories == null || categories.isEmpty()) {
            return profile.getRubro();
        }
        return categories.stream()
            .sorted(categoryComparator())
            .map(Category::getName)
            .findFirst()
            .orElse(profile.getRubro());
    }

    private Map<Long, String> resolveFallbackPhotoUrls(List<ProfessionalProfile> profiles) {
        if (profiles == null || profiles.isEmpty()) {
            return Map.of();
        }

        List<Long> professionalIds = profiles.stream()
            .map(ProfessionalProfile::getId)
            .filter(Objects::nonNull)
            .toList();
        if (professionalIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, String> resolved = new LinkedHashMap<>();
        businessPhotoRepository.findByProfessional_IdInAndTypeInOrderByProfessional_IdAscCreatedAtAsc(
            professionalIds,
            List.of(BusinessPhotoType.LOCAL, BusinessPhotoType.WORK)
        ).stream()
            .forEach(photo -> {
                Long professionalId = photo.getProfessional() == null ? null : photo.getProfessional().getId();
                if (professionalId == null || resolved.containsKey(professionalId)) {
                    return;
                }
                String normalized = normalizeOptionalUrl(photo.getUrl());
                if (normalized != null) {
                    resolved.put(professionalId, normalized);
                }
            });

        for (ProfessionalProfile profile : profiles) {
            Long professionalId = profile.getId();
            if (professionalId == null || resolved.containsKey(professionalId)) {
                continue;
            }
            String fallbackFromLegacyPhotos = firstValidPhoto(profile.getPublicPhotos());
            if (fallbackFromLegacyPhotos != null) {
                resolved.put(professionalId, fallbackFromLegacyPhotos);
            }
        }

        return resolved;
    }

    private String firstValidPhoto(List<String> photos) {
        if (photos == null || photos.isEmpty()) {
            return null;
        }
        for (String photo : photos) {
            String normalized = normalizeOptionalUrl(photo);
            if (normalized != null) {
                return normalized;
            }
        }
        return null;
    }

    private String normalizeOptionalUrl(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private MediaPresentationDto toMediaPresentation(Double positionX, Double positionY, Double zoom) {
        return new MediaPresentationDto(
            positionX != null ? positionX : 50d,
            positionY != null ? positionY : 50d,
            zoom != null ? zoom : 1d
        );
    }

    private Comparator<Category> categoryComparator() {
        return Comparator.comparingInt(
            (Category category) -> category.getDisplayOrder() == null ? Integer.MAX_VALUE : category.getDisplayOrder()
        ).thenComparing(Category::getName);
    }
}

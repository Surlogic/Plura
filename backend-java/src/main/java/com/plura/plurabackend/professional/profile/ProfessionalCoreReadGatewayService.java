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
import com.plura.plurabackend.professional.model.ProfessionalProfile;
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

    public ProfessionalCoreReadGatewayService(
        ProfessionalProfileRepository professionalProfileRepository,
        ProfesionalServiceRepository profesionalServiceRepository
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
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
        Map<Long, ProfessionalProfile> byId = professionalProfileRepository.findByIdInAndActiveTrueWithRelations(ids)
            .stream()
            .collect(LinkedHashMap::new, (map, profile) -> map.put(profile.getId(), profile), Map::putAll);
        return ids.stream()
            .map(byId::get)
            .filter(Objects::nonNull)
            .map(this::toHomeProfileView)
            .toList();
    }

    @Override
    public List<ProfessionalHomeProfileView> findRecentActiveProfiles(int page, int size) {
        return professionalProfileRepository.findByActiveTrueWithRelationsOrderByCreatedAtDesc(
                PageRequest.of(Math.max(0, page), Math.max(1, size))
            ).stream()
            .map(this::toHomeProfileView)
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

    private ProfessionalHomeProfileView toHomeProfileView(ProfessionalProfile profile) {
        String displayName = profile.getUser() == null ? profile.getDisplayName() : profile.getUser().getFullName();
        String slug = profile.getSlug();
        if (slug == null || slug.isBlank()) {
            slug = SlugUtils.toSlug(displayName == null ? "profesional" : displayName);
        }
        return new ProfessionalHomeProfileView(
            profile.getId(),
            slug,
            displayName,
            resolvePrimaryCategoryName(profile),
            profile.getRating(),
            resolveImageUrl(profile)
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

    private String resolveImageUrl(ProfessionalProfile profile) {
        List<String> photos = profile.getPublicPhotos();
        if (photos != null) {
            for (String photo : photos) {
                if (photo != null && !photo.isBlank()) {
                    return photo.trim();
                }
            }
        }
        Set<Category> categories = profile.getCategories();
        if (categories == null || categories.isEmpty()) {
            return null;
        }
        return categories.stream()
            .sorted(categoryComparator())
            .map(Category::getImageUrl)
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(url -> !url.isBlank())
            .findFirst()
            .orElse(null);
    }

    private Comparator<Category> categoryComparator() {
        return Comparator.comparingInt(
            (Category category) -> category.getDisplayOrder() == null ? Integer.MAX_VALUE : category.getDisplayOrder()
        ).thenComparing(Category::getName);
    }
}

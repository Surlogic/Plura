package com.plura.plurabackend.core.home;

import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.category.dto.CategoryResponse;
import com.plura.plurabackend.core.category.model.Category;
import com.plura.plurabackend.core.category.repository.CategoryRepository;
import com.plura.plurabackend.core.common.util.SlugUtils;
import com.plura.plurabackend.core.home.dto.HomeResponse;
import com.plura.plurabackend.core.home.dto.HomeStatsResponse;
import com.plura.plurabackend.core.home.dto.HomeTopProfessionalResponse;
import com.plura.plurabackend.core.professional.ProfessionalHomeGateway;
import com.plura.plurabackend.core.professional.ProfessionalHomeProfileView;
import com.plura.plurabackend.core.storage.ImageStorageService;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HomeService {

    private static final int TOP_PROFESSIONALS_LIMIT = 8;
    private static final List<BookingOperationalStatus> TOP_BOOKING_STATUSES = List.of(
        BookingOperationalStatus.CONFIRMED,
        BookingOperationalStatus.COMPLETED
    );

    private final UserRepository userRepository;
    private final ProfessionalHomeGateway professionalHomeGateway;
    private final CategoryRepository categoryRepository;
    private final BookingRepository bookingRepository;
    private final ImageStorageService imageStorageService;
    private final ZoneId appZoneId;

    public HomeService(
        UserRepository userRepository,
        ProfessionalHomeGateway professionalHomeGateway,
        CategoryRepository categoryRepository,
        BookingRepository bookingRepository,
        ImageStorageService imageStorageService,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.userRepository = userRepository;
        this.professionalHomeGateway = professionalHomeGateway;
        this.categoryRepository = categoryRepository;
        this.bookingRepository = bookingRepository;
        this.imageStorageService = imageStorageService;
        this.appZoneId = ZoneId.of(appTimezone);
    }

    @Cacheable("homeData")
    @Transactional(readOnly = true)
    public HomeResponse getHomeData() {
        List<Category> activeCategories = categoryRepository.findByActiveTrueOrderByDisplayOrderAscNameAsc();
        Map<UUID, Long> professionalsCountByCategoryId = resolveProfessionalsCountByCategoryId(activeCategories);

        List<CategoryResponse> categories = activeCategories.stream()
            .map(category -> mapCategory(category, professionalsCountByCategoryId))
            .toList();

        HomeStatsResponse stats = new HomeStatsResponse(
            userRepository.countByRoleAndDeletedAtIsNull(UserRole.USER),
            professionalHomeGateway.countActiveProfessionals(),
            activeCategories.size(),
            countMonthlyBookings()
        );

        List<HomeTopProfessionalResponse> topProfessionals = resolveTopProfessionals();

        return new HomeResponse(stats, categories, topProfessionals);
    }

    private Map<UUID, Long> resolveProfessionalsCountByCategoryId(List<Category> activeCategories) {
        if (activeCategories.isEmpty()) {
            return Map.of();
        }

        List<UUID> categoryIds = activeCategories.stream()
            .map(Category::getId)
            .filter(Objects::nonNull)
            .toList();

        if (categoryIds.isEmpty()) {
            return Map.of();
        }
        return professionalHomeGateway.countActiveProfessionalsGroupedByCategoryIds(categoryIds);
    }

    private long countMonthlyBookings() {
        LocalDate monthStartDate = LocalDate.now(appZoneId).withDayOfMonth(1);
        LocalDateTime monthStart = monthStartDate.atStartOfDay();
        LocalDateTime nextMonthStart = monthStartDate.plusMonths(1).atStartOfDay();
        return bookingRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThanAndOperationalStatusNot(
            monthStart,
            nextMonthStart,
            BookingOperationalStatus.CANCELLED
        );
    }

    private List<HomeTopProfessionalResponse> resolveTopProfessionals() {
        List<ProfessionalHomeProfileView> topProfiles = loadTopProfiles();
        return topProfiles.stream()
            .map(this::mapTopProfessional)
            .toList();
    }

    private List<ProfessionalHomeProfileView> loadTopProfiles() {
        Pageable limit = PageRequest.of(0, TOP_PROFESSIONALS_LIMIT);
        LocalDateTime since = LocalDate.now(appZoneId).minusMonths(3).atStartOfDay();
        List<Object[]> rankedRows = bookingRepository.findTopProfessionalIdsByStatuses(TOP_BOOKING_STATUSES, since, limit);

        if (rankedRows.isEmpty()) {
            return professionalHomeGateway.findRecentActiveProfiles(0, TOP_PROFESSIONALS_LIMIT);
        }

        List<Long> rankedIds = rankedRows.stream()
            .map(row -> row == null || row.length == 0 ? null : (Number) row[0])
            .filter(Objects::nonNull)
            .map(Number::longValue)
            .toList();

        List<ProfessionalHomeProfileView> ordered = new ArrayList<>(
            professionalHomeGateway.findTopActiveProfilesByIds(rankedIds)
        );

        if (ordered.size() >= TOP_PROFESSIONALS_LIMIT) {
            return ordered;
        }

        Collection<Long> alreadyIncluded = ordered.stream()
            .map(ProfessionalHomeProfileView::professionalId)
            .toList();
        List<ProfessionalHomeProfileView> recent = professionalHomeGateway.findRecentActiveProfiles(0, TOP_PROFESSIONALS_LIMIT);
        for (ProfessionalHomeProfileView profile : recent) {
            if (!alreadyIncluded.contains(profile.professionalId())) {
                ordered.add(profile);
            }
            if (ordered.size() >= TOP_PROFESSIONALS_LIMIT) {
                break;
            }
        }
        return ordered;
    }

    private HomeTopProfessionalResponse mapTopProfessional(ProfessionalHomeProfileView profile) {
        String fullName = profile.displayName() == null || profile.displayName().isBlank()
            ? "Profesional"
            : profile.displayName();
        String slug = profile.slug();
        if (slug == null || slug.isBlank()) {
            slug = SlugUtils.toSlug(fullName);
        }
        return new HomeTopProfessionalResponse(
            String.valueOf(profile.professionalId()),
            slug,
            fullName,
            profile.primaryCategoryName(),
            profile.rating(),
            profile.reviewsCount(),
            resolvePublicUrl(profile.imageUrl()),
            resolvePublicUrl(profile.bannerUrl()),
            profile.bannerMedia(),
            resolvePublicUrl(profile.logoUrl()),
            profile.logoMedia(),
            resolvePublicUrl(profile.fallbackPhotoUrl())
        );
    }

    private String resolvePublicUrl(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return imageStorageService.resolvePublicUrl(value);
    }

    private CategoryResponse mapCategory(Category category, Map<UUID, Long> professionalsCountByCategoryId) {
        return new CategoryResponse(
            category.getId(),
            category.getName(),
            category.getSlug(),
            category.getImageUrl(),
            category.getDisplayOrder(),
            professionalsCountByCategoryId.getOrDefault(category.getId(), 0L)
        );
    }
}

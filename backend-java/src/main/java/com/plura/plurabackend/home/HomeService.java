package com.plura.plurabackend.home;

import com.plura.plurabackend.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.booking.repository.BookingRepository;
import com.plura.plurabackend.category.dto.CategoryResponse;
import com.plura.plurabackend.category.model.Category;
import com.plura.plurabackend.category.repository.CategoryRepository;
import com.plura.plurabackend.common.util.SlugUtils;
import com.plura.plurabackend.home.dto.HomeResponse;
import com.plura.plurabackend.home.dto.HomeStatsResponse;
import com.plura.plurabackend.home.dto.HomeTopProfessionalResponse;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
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
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final CategoryRepository categoryRepository;
    private final BookingRepository bookingRepository;
    private final ZoneId appZoneId;

    public HomeService(
        UserRepository userRepository,
        ProfessionalProfileRepository professionalProfileRepository,
        CategoryRepository categoryRepository,
        BookingRepository bookingRepository,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.userRepository = userRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.categoryRepository = categoryRepository;
        this.bookingRepository = bookingRepository;
        this.appZoneId = ZoneId.of(appTimezone);
    }

    @Cacheable("homeData")
    @Transactional(readOnly = true)
    public HomeResponse getHomeData() {
        List<Category> activeCategories = categoryRepository.findByActiveTrueOrderByDisplayOrderAscNameAsc();
        List<CategoryResponse> categories = activeCategories.stream()
            .map(this::mapCategory)
            .toList();

        HomeStatsResponse stats = new HomeStatsResponse(
            userRepository.countByRoleAndDeletedAtIsNull(UserRole.USER),
            professionalProfileRepository.countByActiveTrue(),
            activeCategories.size(),
            countMonthlyBookings()
        );

        List<HomeTopProfessionalResponse> topProfessionals = resolveTopProfessionals();

        return new HomeResponse(stats, categories, topProfessionals);
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
        List<ProfessionalProfile> topProfiles = loadTopProfiles();
        return topProfiles.stream()
            .map(this::mapTopProfessional)
            .toList();
    }

    private List<ProfessionalProfile> loadTopProfiles() {
        Pageable limit = PageRequest.of(0, TOP_PROFESSIONALS_LIMIT);
        List<Object[]> rankedRows = bookingRepository.findTopProfessionalIdsByStatuses(TOP_BOOKING_STATUSES, limit);

        if (rankedRows.isEmpty()) {
            return professionalProfileRepository.findByActiveTrueWithRelationsOrderByCreatedAtDesc(limit);
        }

        List<Long> rankedIds = rankedRows.stream()
            .map(row -> row == null || row.length == 0 ? null : (Number) row[0])
            .filter(Objects::nonNull)
            .map(Number::longValue)
            .toList();

        Map<Long, ProfessionalProfile> byId = professionalProfileRepository.findByIdInAndActiveTrueWithRelations(rankedIds)
            .stream()
            .collect(LinkedHashMap::new, (map, profile) -> map.put(profile.getId(), profile), Map::putAll);

        List<ProfessionalProfile> ordered = new ArrayList<>();
        for (Long profileId : rankedIds) {
            ProfessionalProfile profile = byId.get(profileId);
            if (profile != null) {
                ordered.add(profile);
            }
        }

        if (ordered.size() >= TOP_PROFESSIONALS_LIMIT) {
            return ordered;
        }

        Collection<Long> alreadyIncluded = ordered.stream()
            .map(ProfessionalProfile::getId)
            .toList();
        List<ProfessionalProfile> recent = professionalProfileRepository.findByActiveTrueWithRelationsOrderByCreatedAtDesc(limit);
        for (ProfessionalProfile profile : recent) {
            if (!alreadyIncluded.contains(profile.getId())) {
                ordered.add(profile);
            }
            if (ordered.size() >= TOP_PROFESSIONALS_LIMIT) {
                break;
            }
        }
        return ordered;
    }

    private HomeTopProfessionalResponse mapTopProfessional(ProfessionalProfile profile) {
        User user = profile.getUser();
        String fullName = user == null ? "Profesional" : user.getFullName();
        String slug = profile.getSlug();
        if (slug == null || slug.isBlank()) {
            slug = SlugUtils.toSlug(fullName);
        }
        return new HomeTopProfessionalResponse(
            String.valueOf(profile.getId()),
            slug,
            fullName,
            resolvePrimaryCategoryName(profile),
            profile.getRating(),
            resolveImageUrl(profile)
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
            .filter(url -> url != null && !url.isBlank())
            .findFirst()
            .orElse(null);
    }

    private CategoryResponse mapCategory(Category category) {
        return new CategoryResponse(
            category.getId(),
            category.getName(),
            category.getSlug(),
            category.getImageUrl(),
            category.getDisplayOrder()
        );
    }

    private Comparator<Category> categoryComparator() {
        return Comparator.comparingInt(
            (Category category) -> category.getDisplayOrder() == null ? Integer.MAX_VALUE : category.getDisplayOrder()
        ).thenComparing(Category::getName);
    }
}

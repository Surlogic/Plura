package com.plura.plurabackend.review;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.core.common.util.SlugUtils;
import com.plura.plurabackend.core.home.dto.HomeTopProfessionalResponse;
import com.plura.plurabackend.core.professional.ProfessionalHomeProfileView;
import com.plura.plurabackend.core.professional.ProfessionalPublicSummary;
import com.plura.plurabackend.core.storage.ImageStorageService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.professional.application.ProfilePublicPageAssembler;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.photo.repository.BusinessPhotoRepository;
import com.plura.plurabackend.professional.profile.ProfessionalCategorySupport;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PublicSurfaceRatingPropagationTest {

    private ProfilePublicPageAssembler assembler;

    @BeforeEach
    void setUp() {
        BusinessPhotoRepository businessPhotoRepository = mock(BusinessPhotoRepository.class);
        ProfessionalCategorySupport categorySupport = mock(ProfessionalCategorySupport.class);
        ProfesionalServiceRepository serviceRepository = mock(ProfesionalServiceRepository.class);
        BookingPolicySnapshotService bookingPolicySnapshotService = mock(BookingPolicySnapshotService.class);
        ImageStorageService imageStorageService = mock(ImageStorageService.class);

        when(categorySupport.resolvePrimaryRubro(any())).thenReturn("Peluqueria");
        when(categorySupport.mapCategories(any())).thenReturn(List.of());
        when(serviceRepository.findByProfessional_IdOrderByCreatedAtDesc(any())).thenReturn(List.of());
        when(businessPhotoRepository.findByProfessional_IdAndTypeInOrderByCreatedAtAsc(any(), any())).thenReturn(List.of());
        when(bookingPolicySnapshotService.buildForProfessionalId(any())).thenReturn(null);
        when(bookingPolicySnapshotService.toResponse((com.plura.plurabackend.core.booking.policy.ResolvedBookingPolicy) any())).thenReturn(null);
        when(imageStorageService.resolvePublicUrl(any())).thenAnswer(inv -> inv.getArgument(0));

        assembler = new ProfilePublicPageAssembler(
            businessPhotoRepository,
            categorySupport,
            serviceRepository,
            bookingPolicySnapshotService,
            imageStorageService,
            new ObjectMapper()
        );
    }

    private ProfessionalProfile makeProfile(Double rating, Integer reviewsCount) {
        User user = new User();
        user.setId(1L);
        user.setFullName("Ana Garcia");

        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(10L);
        profile.setSlug("ana-garcia");
        profile.setUser(user);
        profile.setRating(rating);
        profile.setReviewsCount(reviewsCount);
        profile.setCategories(Set.of());
        profile.setPublicPhotos(List.of());
        return profile;
    }

    @Test
    void summaryExposesRealRatingAndCount() {
        ProfessionalProfile profile = makeProfile(4.7, 23);

        ProfesionalPublicSummaryResponse response = assembler.toSummary(profile);

        assertEquals(4.7, response.getRating());
        assertEquals(23, response.getReviewsCount());
    }

    @Test
    void summaryExposesNullWhenNoReviews() {
        ProfessionalProfile profile = makeProfile(null, 0);

        ProfesionalPublicSummaryResponse response = assembler.toSummary(profile);

        assertNull(response.getRating());
        assertEquals(0, response.getReviewsCount());
    }

    @Test
    void publicPageExposesRealRatingAndCount() {
        ProfessionalProfile profile = makeProfile(3.8, 15);

        ProfesionalPublicPageResponse response = assembler.toPublicPage(profile);

        assertEquals(3.8, response.getRating());
        assertEquals(15, response.getReviewsCount());
    }

    @Test
    void publicPageExposesNullRatingWhenNoReviews() {
        ProfessionalProfile profile = makeProfile(null, 0);

        ProfesionalPublicPageResponse response = assembler.toPublicPage(profile);

        assertNull(response.getRating());
        assertEquals(0, response.getReviewsCount());
    }

    @Test
    void homeProfileViewPropagatesRatingAndCount() {
        ProfessionalHomeProfileView view = new ProfessionalHomeProfileView(
            10L, "ana-garcia", "Ana Garcia", "Peluqueria", 4.2, 8,
            "https://cdn.test/logo.jpg", null, null, null, null, null
        );

        HomeTopProfessionalResponse response = new HomeTopProfessionalResponse(
            String.valueOf(view.professionalId()),
            view.slug(),
            view.displayName(),
            view.primaryCategoryName(),
            view.rating(),
            view.reviewsCount(),
            view.imageUrl(),
            view.bannerUrl(),
            view.bannerMedia(),
            view.logoUrl(),
            view.logoMedia(),
            view.fallbackPhotoUrl()
        );

        assertEquals(4.2, response.getRating());
        assertEquals(8, response.getReviewsCount());
    }

    @Test
    void homeProfileViewWithNullRating() {
        ProfessionalHomeProfileView view = new ProfessionalHomeProfileView(
            10L, "ana-garcia", "Ana Garcia", "Peluqueria", null, 0,
            null, null, null, null, null, null
        );

        HomeTopProfessionalResponse response = new HomeTopProfessionalResponse(
            String.valueOf(view.professionalId()),
            view.slug(),
            view.displayName(),
            view.primaryCategoryName(),
            view.rating(),
            view.reviewsCount(),
            view.imageUrl(),
            view.bannerUrl(),
            view.bannerMedia(),
            view.logoUrl(),
            view.logoMedia(),
            view.fallbackPhotoUrl()
        );

        assertNull(response.getRating());
        assertEquals(0, response.getReviewsCount());
    }

    @Test
    void publicSummaryRecordPropagatesFields() {
        ProfessionalPublicSummary summary = new ProfessionalPublicSummary(
            10L, "ana-garcia", "Ana Garcia", "Peluqueria", "Montevideo",
            "Especialista en color", List.of(), "https://cdn.test/logo.jpg", 4.9, 50
        );

        assertEquals(4.9, summary.rating());
        assertEquals(50, summary.reviewsCount());
    }

    @Test
    void publicSummaryRecordWithNullRating() {
        ProfessionalPublicSummary summary = new ProfessionalPublicSummary(
            10L, "ana-garcia", "Ana Garcia", "Peluqueria", "Montevideo",
            null, List.of(), null, null, null
        );

        assertNull(summary.rating());
        assertNull(summary.reviewsCount());
    }
}

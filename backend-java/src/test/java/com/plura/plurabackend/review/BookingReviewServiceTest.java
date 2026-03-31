package com.plura.plurabackend.review;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.booking.ProfessionalActorLookupGateway;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.review.BookingReviewPolicy;
import com.plura.plurabackend.core.review.BookingReviewService;
import com.plura.plurabackend.core.review.ReviewNotificationIntegrationService;
import com.plura.plurabackend.core.review.dto.BookingReviewReportResponse;
import com.plura.plurabackend.core.review.dto.BookingReviewResponse;
import com.plura.plurabackend.core.review.dto.CreateBookingReviewRequest;
import com.plura.plurabackend.core.review.dto.CreateBookingReviewReportRequest;
import com.plura.plurabackend.core.review.model.BookingReview;
import com.plura.plurabackend.core.review.model.BookingReviewReport;
import com.plura.plurabackend.core.review.model.BookingReviewReportReason;
import com.plura.plurabackend.core.review.model.BookingReviewReportStatus;
import com.plura.plurabackend.core.review.repository.BookingReviewReportRepository;
import com.plura.plurabackend.core.review.repository.BookingReviewRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;

class BookingReviewServiceTest {

    private BookingReviewRepository bookingReviewRepository;
    private BookingReviewReportRepository bookingReviewReportRepository;
    private BookingRepository bookingRepository;
    private ProfessionalProfileRepository professionalProfileRepository;
    private ProfessionalActorLookupGateway professionalActorLookupGateway;
    private ReviewNotificationIntegrationService reviewNotificationIntegrationService;
    private BookingReviewService service;

    @BeforeEach
    void setUp() {
        bookingReviewRepository = mock(BookingReviewRepository.class);
        bookingReviewReportRepository = mock(BookingReviewReportRepository.class);
        bookingRepository = mock(BookingRepository.class);
        professionalProfileRepository = mock(ProfessionalProfileRepository.class);
        professionalActorLookupGateway = mock(ProfessionalActorLookupGateway.class);
        reviewNotificationIntegrationService = mock(ReviewNotificationIntegrationService.class);
        service = new BookingReviewService(
            bookingReviewRepository,
            bookingReviewReportRepository,
            bookingRepository,
            professionalProfileRepository,
            professionalActorLookupGateway,
            reviewNotificationIntegrationService,
            "America/Montevideo"
        );
    }

    private Booking makeBooking(Long id, Long userId, Long professionalId, BookingOperationalStatus status) {
        User user = new User();
        user.setId(userId);
        user.setFullName("Cliente Test");

        Booking booking = new Booking();
        booking.setId(id);
        booking.setUser(user);
        booking.setProfessionalId(professionalId);
        booking.setOperationalStatus(status);
        booking.setServiceNameSnapshot("Corte de pelo");
        booking.setTimezone("America/Montevideo");
        booking.setStartDateTime(LocalDateTime.of(2026, 3, 10, 9, 0));
        if (status == BookingOperationalStatus.COMPLETED) {
            booking.setCompletedAt(LocalDateTime.now().minusDays(1));
        }
        return booking;
    }

    private ProfessionalProfile makeProfile(Long id) {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(id);
        profile.setRating(0d);
        profile.setReviewsCount(0);
        return profile;
    }

    @Test
    void createsReviewForEligibleBooking() {
        Booking booking = makeBooking(1L, 10L, 20L, BookingOperationalStatus.COMPLETED);
        ProfessionalProfile profile = makeProfile(20L);

        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.existsByBooking_Id(1L)).thenReturn(false);
        when(professionalProfileRepository.findById(20L)).thenReturn(Optional.of(profile));
        when(bookingReviewRepository.findRatingAggregateByProfessionalId(20L)).thenReturn(new Object[]{4.5, 1L});
        when(bookingReviewRepository.saveAndFlush(any(BookingReview.class))).thenAnswer(invocation -> {
            BookingReview r = invocation.getArgument(0);
            r.setId(100L);
            r.setCreatedAt(LocalDateTime.now());
            r.setUpdatedAt(LocalDateTime.now());
            return r;
        });

        CreateBookingReviewRequest request = new CreateBookingReviewRequest(5, "Excelente servicio");
        BookingReviewResponse response = service.createReview(1L, 10L, request);

        assertEquals(5, response.getRating());
        assertEquals("Excelente servicio", response.getText());
        assertEquals("Cliente Test", response.getAuthorDisplayName());
        assertFalse(response.isTextHiddenByProfessional());
        assertFalse(response.isReportedByProfessional());

        verify(professionalProfileRepository).save(any(ProfessionalProfile.class));
        verify(reviewNotificationIntegrationService).notifyReviewReceived(any(), eq(booking));
    }

    @Test
    void createsReviewWithOnlyRating() {
        Booking booking = makeBooking(1L, 10L, 20L, BookingOperationalStatus.COMPLETED);
        ProfessionalProfile profile = makeProfile(20L);

        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.existsByBooking_Id(1L)).thenReturn(false);
        when(professionalProfileRepository.findById(20L)).thenReturn(Optional.of(profile));
        when(bookingReviewRepository.findRatingAggregateByProfessionalId(20L)).thenReturn(new Object[]{3.0, 1L});
        when(bookingReviewRepository.saveAndFlush(any(BookingReview.class))).thenAnswer(invocation -> {
            BookingReview r = invocation.getArgument(0);
            r.setId(101L);
            r.setCreatedAt(LocalDateTime.now());
            r.setUpdatedAt(LocalDateTime.now());
            return r;
        });

        CreateBookingReviewRequest request = new CreateBookingReviewRequest(3, null);
        BookingReviewResponse response = service.createReview(1L, 10L, request);

        assertEquals(3, response.getRating());
        assertNull(response.getText());
    }

    @Test
    void rejectsReviewForOtherUsersBooking() {
        Booking booking = makeBooking(1L, 10L, 20L, BookingOperationalStatus.COMPLETED);
        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));

        CreateBookingReviewRequest request = new CreateBookingReviewRequest(5, "Genial");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.createReview(1L, 99L, request));

        assertEquals(403, ex.getStatusCode().value());
        verify(bookingReviewRepository, never()).save(any());
    }

    @Test
    void rejectsReviewForNonCompletedBooking() {
        Booking booking = makeBooking(1L, 10L, 20L, BookingOperationalStatus.CONFIRMED);
        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));

        CreateBookingReviewRequest request = new CreateBookingReviewRequest(4, "Bien");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.createReview(1L, 10L, request));

        assertEquals(409, ex.getStatusCode().value());
        verify(bookingReviewRepository, never()).save(any());
    }

    @Test
    void rejectsDuplicateReview() {
        Booking booking = makeBooking(1L, 10L, 20L, BookingOperationalStatus.COMPLETED);
        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.existsByBooking_Id(1L)).thenReturn(true);

        CreateBookingReviewRequest request = new CreateBookingReviewRequest(4, "Otra reseña");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.createReview(1L, 10L, request));

        assertEquals(409, ex.getStatusCode().value());
        verify(bookingReviewRepository, never()).save(any());
    }

    @Test
    void rejectsReviewWhenWindowExpired() {
        Booking booking = makeBooking(1L, 10L, 20L, BookingOperationalStatus.COMPLETED);
        booking.setCompletedAt(LocalDateTime.now().minusDays(BookingReviewPolicy.REVIEW_WINDOW_DAYS + 1L));
        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));

        CreateBookingReviewRequest request = new CreateBookingReviewRequest(4, "Tarde");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.createReview(1L, 10L, request));

        assertEquals(409, ex.getStatusCode().value());
        verify(bookingReviewRepository, never()).save(any());
    }

    @Test
    void updatesAggregateOnCreate() {
        Booking booking = makeBooking(1L, 10L, 20L, BookingOperationalStatus.COMPLETED);
        ProfessionalProfile profile = makeProfile(20L);

        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.existsByBooking_Id(1L)).thenReturn(false);
        when(professionalProfileRepository.findById(20L)).thenReturn(Optional.of(profile));
        when(bookingReviewRepository.findRatingAggregateByProfessionalId(20L)).thenReturn(new Object[]{4.2, 5L});
        when(bookingReviewRepository.saveAndFlush(any(BookingReview.class))).thenAnswer(invocation -> {
            BookingReview r = invocation.getArgument(0);
            r.setId(102L);
            r.setCreatedAt(LocalDateTime.now());
            r.setUpdatedAt(LocalDateTime.now());
            return r;
        });

        service.createReview(1L, 10L, new CreateBookingReviewRequest(5, null));

        ArgumentCaptor<ProfessionalProfile> captor = ArgumentCaptor.forClass(ProfessionalProfile.class);
        verify(professionalProfileRepository).save(captor.capture());
        assertEquals(4.2, captor.getValue().getRating());
        assertEquals(5, captor.getValue().getReviewsCount());
    }

    @Test
    void updatesAggregateOnCreateWhenRepositoryReturnsNestedRow() {
        Booking booking = makeBooking(1L, 10L, 20L, BookingOperationalStatus.COMPLETED);
        ProfessionalProfile profile = makeProfile(20L);

        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.existsByBooking_Id(1L)).thenReturn(false);
        when(professionalProfileRepository.findById(20L)).thenReturn(Optional.of(profile));
        when(bookingReviewRepository.findRatingAggregateByProfessionalId(20L))
            .thenReturn(new Object[]{new Object[]{4.8, 2L}});
        when(bookingReviewRepository.saveAndFlush(any(BookingReview.class))).thenAnswer(invocation -> {
            BookingReview review = invocation.getArgument(0);
            review.setId(103L);
            review.setCreatedAt(LocalDateTime.now());
            review.setUpdatedAt(LocalDateTime.now());
            return review;
        });

        service.createReview(1L, 10L, new CreateBookingReviewRequest(5, "Excelente"));

        ArgumentCaptor<ProfessionalProfile> captor = ArgumentCaptor.forClass(ProfessionalProfile.class);
        verify(professionalProfileRepository).save(captor.capture());
        assertEquals(4.8, captor.getValue().getRating());
        assertEquals(2, captor.getValue().getReviewsCount());
    }

    @Test
    void publicListHidesTextWhenHidden() {
        ProfessionalProfile profile = makeProfile(20L);
        User user = new User();
        user.setId(10L);
        user.setFullName("Autor Test");

        Booking booking = new Booking();
        booking.setId(1L);

        BookingReview review = new BookingReview();
        review.setId(100L);
        review.setBooking(booking);
        review.setProfessional(profile);
        review.setUser(user);
        review.setRating(2);
        review.setReviewText("Mal servicio");
        review.setTextHiddenByProfessional(true);
        review.setCreatedAt(LocalDateTime.now());
        review.setUpdatedAt(LocalDateTime.now());

        when(professionalProfileRepository.findBySlug("test-slug")).thenReturn(Optional.of(profile));
        when(bookingReviewRepository.findPublicByProfessionalId(eq(20L), any()))
            .thenReturn(new PageImpl<>(List.of(review)));

        Page<BookingReviewResponse> page = service.listPublicReviews("test-slug", PageRequest.of(0, 10));

        assertEquals(1, page.getContent().size());
        BookingReviewResponse resp = page.getContent().get(0);
        assertEquals(2, resp.getRating());
        assertNull(resp.getText());
        assertTrue(resp.isTextHiddenByProfessional());
        assertFalse(resp.isReportedByProfessional());
    }

    @Test
    void professionalOwnerCanHideText() {
        ProfessionalProfile profile = makeProfile(20L);
        Booking booking = new Booking();
        booking.setId(1L);

        BookingReview review = new BookingReview();
        review.setId(100L);
        review.setBooking(booking);
        review.setProfessional(profile);
        review.setReviewText("Texto malo");
        review.setTextHiddenByProfessional(false);

        when(professionalActorLookupGateway.findProfessionalIdByUserId(5L)).thenReturn(Optional.of(20L));
        when(bookingReviewRepository.findDetailedByIdAndProfessionalId(100L, 20L)).thenReturn(Optional.of(review));

        service.hideReviewText(100L, 5L);

        assertTrue(review.getTextHiddenByProfessional());
        verify(bookingReviewRepository).save(review);
    }

    @Test
    void professionalCannotHideOtherProfessionalsReview() {
        when(professionalActorLookupGateway.findProfessionalIdByUserId(5L)).thenReturn(Optional.of(99L));
        when(bookingReviewRepository.findDetailedByIdAndProfessionalId(100L, 99L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.hideReviewText(100L, 5L));

        assertEquals(404, ex.getStatusCode().value());
        verify(bookingReviewRepository, never()).save(any());
    }

    @Test
    void professionalOwnerCanShowText() {
        ProfessionalProfile profile = makeProfile(20L);
        Booking booking = new Booking();
        booking.setId(1L);

        BookingReview review = new BookingReview();
        review.setId(100L);
        review.setBooking(booking);
        review.setProfessional(profile);
        review.setTextHiddenByProfessional(true);
        review.setTextHiddenAt(LocalDateTime.now());

        when(professionalActorLookupGateway.findProfessionalIdByUserId(5L)).thenReturn(Optional.of(20L));
        when(bookingReviewRepository.findDetailedByIdAndProfessionalId(100L, 20L)).thenReturn(Optional.of(review));

        service.showReviewText(100L, 5L);

        assertFalse(review.getTextHiddenByProfessional());
        assertNull(review.getTextHiddenAt());
        verify(bookingReviewRepository).save(review);
    }

    @Test
    void concurrentDuplicateReturns409ViaConstraintViolation() {
        Booking booking = makeBooking(1L, 10L, 20L, BookingOperationalStatus.COMPLETED);
        ProfessionalProfile profile = makeProfile(20L);

        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.existsByBooking_Id(1L)).thenReturn(false);
        when(professionalProfileRepository.findById(20L)).thenReturn(Optional.of(profile));
        when(bookingReviewRepository.saveAndFlush(any(BookingReview.class)))
            .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint"));

        CreateBookingReviewRequest request = new CreateBookingReviewRequest(5, "Genial");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.createReview(1L, 10L, request));

        assertEquals(409, ex.getStatusCode().value());
    }

    @Test
    void hideTextDoesNotAlterAggregate() {
        ProfessionalProfile profile = makeProfile(20L);
        profile.setRating(4.5);
        profile.setReviewsCount(10);

        Booking booking = new Booking();
        booking.setId(1L);

        BookingReview review = new BookingReview();
        review.setId(100L);
        review.setBooking(booking);
        review.setProfessional(profile);
        review.setRating(3);
        review.setReviewText("Texto visible");
        review.setTextHiddenByProfessional(false);

        when(professionalActorLookupGateway.findProfessionalIdByUserId(5L)).thenReturn(Optional.of(20L));
        when(bookingReviewRepository.findDetailedByIdAndProfessionalId(100L, 20L)).thenReturn(Optional.of(review));

        service.hideReviewText(100L, 5L);

        assertEquals(4.5, profile.getRating());
        assertEquals(10, profile.getReviewsCount());
        verify(professionalProfileRepository, never()).save(any());
    }

    @Test
    void showTextDoesNotAlterAggregate() {
        ProfessionalProfile profile = makeProfile(20L);
        profile.setRating(4.5);
        profile.setReviewsCount(10);

        Booking booking = new Booking();
        booking.setId(1L);

        BookingReview review = new BookingReview();
        review.setId(100L);
        review.setBooking(booking);
        review.setProfessional(profile);
        review.setTextHiddenByProfessional(true);
        review.setTextHiddenAt(LocalDateTime.now());

        when(professionalActorLookupGateway.findProfessionalIdByUserId(5L)).thenReturn(Optional.of(20L));
        when(bookingReviewRepository.findDetailedByIdAndProfessionalId(100L, 20L)).thenReturn(Optional.of(review));

        service.showReviewText(100L, 5L);

        assertEquals(4.5, profile.getRating());
        assertEquals(10, profile.getReviewsCount());
        verify(professionalProfileRepository, never()).save(any());
    }

    @Test
    void professionalCannotShowOtherProfessionalsReview() {
        when(professionalActorLookupGateway.findProfessionalIdByUserId(5L)).thenReturn(Optional.of(99L));
        when(bookingReviewRepository.findDetailedByIdAndProfessionalId(100L, 99L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.showReviewText(100L, 5L));

        assertEquals(404, ex.getStatusCode().value());
        verify(bookingReviewRepository, never()).save(any());
    }

    @Test
    void publicListShowsTextWhenNotHidden() {
        ProfessionalProfile profile = makeProfile(20L);
        User user = new User();
        user.setId(10L);
        user.setFullName("Autor Visible");

        Booking booking = new Booking();
        booking.setId(1L);

        BookingReview review = new BookingReview();
        review.setId(100L);
        review.setBooking(booking);
        review.setProfessional(profile);
        review.setUser(user);
        review.setRating(5);
        review.setReviewText("Excelente");
        review.setTextHiddenByProfessional(false);
        review.setCreatedAt(LocalDateTime.now());
        review.setUpdatedAt(LocalDateTime.now());

        when(professionalProfileRepository.findBySlug("slug")).thenReturn(Optional.of(profile));
        when(bookingReviewRepository.findPublicByProfessionalId(eq(20L), any()))
            .thenReturn(new PageImpl<>(List.of(review)));

        Page<BookingReviewResponse> page = service.listPublicReviews("slug", PageRequest.of(0, 10));

        BookingReviewResponse resp = page.getContent().get(0);
        assertEquals("Excelente", resp.getText());
        assertFalse(resp.isTextHiddenByProfessional());
        assertFalse(resp.isReportedByProfessional());
    }

    @Test
    void notificationFailureDoesNotBreakReviewCreation() {
        Booking booking = makeBooking(1L, 10L, 20L, BookingOperationalStatus.COMPLETED);
        ProfessionalProfile profile = makeProfile(20L);

        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.existsByBooking_Id(1L)).thenReturn(false);
        when(professionalProfileRepository.findById(20L)).thenReturn(Optional.of(profile));
        when(bookingReviewRepository.findRatingAggregateByProfessionalId(20L)).thenReturn(new Object[]{5.0, 1L});
        when(bookingReviewRepository.saveAndFlush(any(BookingReview.class))).thenAnswer(invocation -> {
            BookingReview r = invocation.getArgument(0);
            r.setId(103L);
            r.setCreatedAt(LocalDateTime.now());
            r.setUpdatedAt(LocalDateTime.now());
            return r;
        });
        doThrow(new RuntimeException("Notification service down"))
            .when(reviewNotificationIntegrationService).notifyReviewReceived(any(), any());

        BookingReviewResponse response = service.createReview(1L, 10L, new CreateBookingReviewRequest(5, "Genial"));

        assertEquals(5, response.getRating());
        assertEquals("Genial", response.getText());
        verify(professionalProfileRepository).save(any(ProfessionalProfile.class));
    }

    @Test
    void deleteReviewUpdatesAggregates() {
        Booking booking = makeBooking(1L, 10L, 20L, BookingOperationalStatus.COMPLETED);
        ProfessionalProfile profile = makeProfile(20L);
        BookingReview review = new BookingReview();
        review.setId(100L);
        review.setBooking(booking);
        review.setProfessional(profile);

        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.findByBooking_Id(1L)).thenReturn(Optional.of(review));
        when(bookingReviewRepository.findRatingAggregateByProfessionalId(20L)).thenReturn(new Object[]{4.1, 3L});
        when(professionalProfileRepository.findById(20L)).thenReturn(Optional.of(profile));

        service.deleteReviewByBookingId(1L, 10L);

        verify(bookingReviewRepository).delete(review);
        verify(bookingReviewRepository).flush();
        assertEquals(4.1, profile.getRating());
        assertEquals(3, profile.getReviewsCount());
    }

    @Test
    void deleteLastReviewLeavesAggregatesInZero() {
        Booking booking = makeBooking(1L, 10L, 20L, BookingOperationalStatus.COMPLETED);
        ProfessionalProfile profile = makeProfile(20L);
        profile.setRating(4.8);
        profile.setReviewsCount(1);

        BookingReview review = new BookingReview();
        review.setId(100L);
        review.setBooking(booking);
        review.setProfessional(profile);

        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.findByBooking_Id(1L)).thenReturn(Optional.of(review));
        when(bookingReviewRepository.findRatingAggregateByProfessionalId(20L)).thenReturn(new Object[]{0d, 0L});
        when(professionalProfileRepository.findById(20L)).thenReturn(Optional.of(profile));

        service.deleteReviewByBookingId(1L, 10L);

        assertEquals(0d, profile.getRating());
        assertEquals(0, profile.getReviewsCount());
    }

    @Test
    void professionalCanReportOwnReview() {
        ProfessionalProfile profile = makeProfile(20L);
        Booking booking = new Booking();
        booking.setId(1L);

        BookingReview review = new BookingReview();
        review.setId(100L);
        review.setBooking(booking);
        review.setProfessional(profile);

        when(professionalActorLookupGateway.findProfessionalIdByUserId(5L)).thenReturn(Optional.of(20L));
        when(bookingReviewRepository.findDetailedByIdAndProfessionalId(100L, 20L)).thenReturn(Optional.of(review));
        when(bookingReviewReportRepository.existsByReview_IdAndProfessional_IdAndStatus(
            100L, 20L, BookingReviewReportStatus.OPEN
        )).thenReturn(false);
        when(bookingReviewReportRepository.saveAndFlush(any(BookingReviewReport.class))).thenAnswer(invocation -> {
            BookingReviewReport report = invocation.getArgument(0);
            report.setId(700L);
            report.setCreatedAt(LocalDateTime.now());
            return report;
        });

        BookingReviewReportResponse response = service.reportReview(
            100L,
            5L,
            new CreateBookingReviewReportRequest(BookingReviewReportReason.SPAM, "Spam evidente")
        );

        assertEquals(700L, response.getId());
        assertEquals(BookingReviewReportReason.SPAM, response.getReason());
        assertEquals(BookingReviewReportStatus.OPEN, response.getStatus());
    }

    @Test
    void cannotCreateDuplicateOpenReportForSameReviewAndProfessional() {
        ProfessionalProfile profile = makeProfile(20L);
        Booking booking = new Booking();
        booking.setId(1L);

        BookingReview review = new BookingReview();
        review.setId(100L);
        review.setBooking(booking);
        review.setProfessional(profile);

        when(professionalActorLookupGateway.findProfessionalIdByUserId(5L)).thenReturn(Optional.of(20L));
        when(bookingReviewRepository.findDetailedByIdAndProfessionalId(100L, 20L)).thenReturn(Optional.of(review));
        when(bookingReviewReportRepository.existsByReview_IdAndProfessional_IdAndStatus(
            100L, 20L, BookingReviewReportStatus.OPEN
        )).thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () ->
            service.reportReview(
                100L,
                5L,
                new CreateBookingReviewReportRequest(BookingReviewReportReason.OTHER, "Duplicado")
            )
        );

        assertEquals(409, exception.getStatusCode().value());
        verify(bookingReviewReportRepository, never()).saveAndFlush(any());
    }
}

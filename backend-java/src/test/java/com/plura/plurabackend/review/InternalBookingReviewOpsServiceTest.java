package com.plura.plurabackend.review;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.review.model.BookingReview;
import com.plura.plurabackend.core.review.model.BookingReviewReport;
import com.plura.plurabackend.core.review.model.BookingReviewReportReason;
import com.plura.plurabackend.core.review.model.BookingReviewReportStatus;
import com.plura.plurabackend.core.review.ops.InternalBookingReviewOpsService;
import com.plura.plurabackend.core.review.ops.dto.InternalReviewAnalyticsResponse;
import com.plura.plurabackend.core.review.ops.dto.InternalReviewDetailResponse;
import com.plura.plurabackend.core.review.ops.dto.InternalReviewListItemResponse;
import com.plura.plurabackend.core.review.repository.BookingReviewReportRepository;
import com.plura.plurabackend.core.review.repository.BookingReviewRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;

class InternalBookingReviewOpsServiceTest {

    private BookingReviewRepository bookingReviewRepository;
    private BookingReviewReportRepository bookingReviewReportRepository;
    private InternalBookingReviewOpsService service;

    private BookingReview sampleReview;
    private User clientUser;
    private User professionalUser;
    private ProfessionalProfile professionalProfile;
    private Booking booking;

    @BeforeEach
    void setUp() {
        bookingReviewRepository = mock(BookingReviewRepository.class);
        bookingReviewReportRepository = mock(BookingReviewReportRepository.class);
        service = new InternalBookingReviewOpsService(bookingReviewRepository, bookingReviewReportRepository);

        clientUser = new User();
        clientUser.setId(10L);
        clientUser.setFullName("Cliente Test");

        professionalUser = new User();
        professionalUser.setId(20L);
        professionalUser.setFullName("Profesional Test");

        professionalProfile = mock(ProfessionalProfile.class);
        when(professionalProfile.getId()).thenReturn(100L);
        when(professionalProfile.getSlug()).thenReturn("profesional-test");
        when(professionalProfile.getUser()).thenReturn(professionalUser);

        booking = mock(Booking.class);
        when(booking.getId()).thenReturn(500L);

        sampleReview = new BookingReview();
        sampleReview.setId(1L);
        sampleReview.setBooking(booking);
        sampleReview.setProfessional(professionalProfile);
        sampleReview.setUser(clientUser);
        sampleReview.setRating(4);
        sampleReview.setReviewText("Excelente servicio");
        sampleReview.setTextHiddenByProfessional(false);
        sampleReview.setTextHiddenByInternalOps(false);
        sampleReview.setInternalModerationNote(null);
        sampleReview.setCreatedAt(LocalDateTime.of(2026, 3, 20, 10, 0));
        sampleReview.setUpdatedAt(LocalDateTime.of(2026, 3, 20, 10, 0));
        sampleReview.setVersion(0L);
    }

    // --- list ---

    @Test
    void list_returnsPagedResults() {
        Page<BookingReview> page = new PageImpl<>(List.of(sampleReview), PageRequest.of(0, 20), 1);
        when(bookingReviewRepository.findAllFiltered(any(), any(), any(), any(), any(), any(), any()))
            .thenReturn(page);
        when(bookingReviewReportRepository.findByReview_IdInOrderByCreatedAtDescIdDesc(any()))
            .thenReturn(List.of());

        Page<InternalReviewListItemResponse> result = service.list(0, 20, null, null, null, null, null, null);

        assertEquals(1, result.getTotalElements());
        InternalReviewListItemResponse item = result.getContent().get(0);
        assertEquals(1L, item.getId());
        assertEquals(500L, item.getBookingId());
        assertEquals(100L, item.getProfessionalId());
        assertEquals("Profesional Test", item.getProfessionalName());
        assertEquals("profesional-test", item.getProfessionalSlug());
        assertEquals(10L, item.getClientUserId());
        assertEquals("Cliente Test", item.getClientName());
        assertEquals(4, item.getRating());
        assertEquals("Excelente servicio", item.getText());
        assertFalse(item.isTextHiddenByProfessional());
        assertFalse(item.isTextHiddenByInternalOps());
        assertFalse(item.isReported());
        assertEquals(0L, item.getReportCount());
    }

    @Test
    void list_clampsSizeToMax100() {
        when(bookingReviewRepository.findAllFiltered(any(), any(), any(), any(), any(), any(), any()))
            .thenReturn(Page.empty());

        service.list(0, 500, null, null, null, null, null, null);

        verify(bookingReviewRepository).findAllFiltered(
            any(), any(), any(), any(), any(), any(),
            eq(PageRequest.of(0, 100))
        );
    }

    // --- detail ---

    @Test
    void detail_returnsReviewDetail() {
        when(bookingReviewRepository.findDetailedById(1L)).thenReturn(Optional.of(sampleReview));
        when(bookingReviewReportRepository.findByReview_IdInOrderByCreatedAtDescIdDesc(List.of(1L)))
            .thenReturn(List.of());

        InternalReviewDetailResponse detail = service.detail(1L);

        assertEquals(1L, detail.getId());
        assertEquals(4, detail.getRating());
        assertEquals("Excelente servicio", detail.getText());
        assertFalse(detail.isTextHiddenByInternalOps());
        assertFalse(detail.isReported());
    }

    @Test
    void detail_throwsNotFoundForMissingReview() {
        when(bookingReviewRepository.findDetailedById(999L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.detail(999L));
        assertEquals(404, ex.getStatusCode().value());
    }

    // --- hideText ---

    @Test
    void hideText_setsInternalOpsFlag() {
        when(bookingReviewRepository.findDetailedById(1L)).thenReturn(Optional.of(sampleReview));
        when(bookingReviewRepository.save(any())).thenReturn(sampleReview);

        service.hideText(1L, null);

        assertTrue(sampleReview.getTextHiddenByInternalOps());
        verify(bookingReviewRepository).save(sampleReview);
    }

    @Test
    void hideText_storesModerationNote() {
        when(bookingReviewRepository.findDetailedById(1L)).thenReturn(Optional.of(sampleReview));
        when(bookingReviewRepository.save(any())).thenReturn(sampleReview);

        service.hideText(1L, "Contenido inapropiado");

        assertTrue(sampleReview.getTextHiddenByInternalOps());
        assertEquals("Contenido inapropiado", sampleReview.getInternalModerationNote());
    }

    @Test
    void hideText_doesNotAlterRating() {
        when(bookingReviewRepository.findDetailedById(1L)).thenReturn(Optional.of(sampleReview));
        when(bookingReviewRepository.save(any())).thenReturn(sampleReview);

        service.hideText(1L, "Spam");

        assertEquals(4, sampleReview.getRating());
    }

    @Test
    void hideText_doesNotAlterProfessionalHideFlag() {
        sampleReview.setTextHiddenByProfessional(true);
        when(bookingReviewRepository.findDetailedById(1L)).thenReturn(Optional.of(sampleReview));
        when(bookingReviewRepository.save(any())).thenReturn(sampleReview);

        service.hideText(1L, null);

        assertTrue(sampleReview.getTextHiddenByProfessional());
        assertTrue(sampleReview.getTextHiddenByInternalOps());
    }

    // --- showText ---

    @Test
    void showText_clearsInternalOpsFlag() {
        sampleReview.setTextHiddenByInternalOps(true);
        sampleReview.setInternalModerationNote("Motivo anterior");
        when(bookingReviewRepository.findDetailedById(1L)).thenReturn(Optional.of(sampleReview));
        when(bookingReviewRepository.save(any())).thenReturn(sampleReview);

        service.showText(1L);

        assertFalse(sampleReview.getTextHiddenByInternalOps());
        assertEquals("Motivo anterior", sampleReview.getInternalModerationNote());
        verify(bookingReviewRepository).save(sampleReview);
    }

    @Test
    void showText_doesNotAlterRating() {
        sampleReview.setTextHiddenByInternalOps(true);
        when(bookingReviewRepository.findDetailedById(1L)).thenReturn(Optional.of(sampleReview));
        when(bookingReviewRepository.save(any())).thenReturn(sampleReview);

        service.showText(1L);

        assertEquals(4, sampleReview.getRating());
    }

    @Test
    void showText_doesNotAlterProfessionalHideFlag() {
        sampleReview.setTextHiddenByProfessional(true);
        sampleReview.setTextHiddenByInternalOps(true);
        when(bookingReviewRepository.findDetailedById(1L)).thenReturn(Optional.of(sampleReview));
        when(bookingReviewRepository.save(any())).thenReturn(sampleReview);

        service.showText(1L);

        assertTrue(sampleReview.getTextHiddenByProfessional());
        assertFalse(sampleReview.getTextHiddenByInternalOps());
    }

    // --- analytics ---

    @Test
    void analytics_returnsAggregatedMetrics() {
        when(bookingReviewRepository.countFiltered(any(), any())).thenReturn(50L);
        when(bookingReviewRepository.averageRatingFiltered(any(), any())).thenReturn(4.2);
        when(bookingReviewRepository.countWithText(any(), any())).thenReturn(40L);
        when(bookingReviewRepository.countWithoutText(any(), any())).thenReturn(10L);
        when(bookingReviewRepository.countTextHidden(any(), any())).thenReturn(3L);
        List<Object[]> ratingDist = List.of(
            new Object[]{5, 20L},
            new Object[]{4, 15L},
            new Object[]{3, 10L},
            new Object[]{2, 3L},
            new Object[]{1, 2L}
        );
        when(bookingReviewRepository.countByRating(any(), any())).thenReturn(ratingDist);
        List<Object[]> topVol = new java.util.ArrayList<>();
        topVol.add(new Object[]{100L, "Pro A", "pro-a", 12L, 4.5});
        when(bookingReviewRepository.topProfessionalsByVolume(any(), any(), any())).thenReturn(topVol);
        List<Object[]> topRat = new java.util.ArrayList<>();
        topRat.add(new Object[]{200L, "Pro B", "pro-b", 5L, 5.0});
        when(bookingReviewRepository.topProfessionalsByRating(any(), any(), any())).thenReturn(topRat);
        List<Object[]> daily = new java.util.ArrayList<>();
        daily.add(new Object[]{"2026-03-20", 8L, 4.1});
        when(bookingReviewRepository.dailyStats(any(), any())).thenReturn(daily);

        InternalReviewAnalyticsResponse analytics = service.analytics(null, null);

        assertEquals(50L, analytics.getTotalReviews());
        assertEquals(4.2, analytics.getAverageRating());
        assertEquals(40L, analytics.getWithText());
        assertEquals(10L, analytics.getWithoutText());
        assertEquals(3L, analytics.getTextHidden());
        assertEquals(5, analytics.getCountByRating().size());
        assertEquals(1, analytics.getTopByVolume().size());
        assertEquals("Pro A", analytics.getTopByVolume().get(0).getName());
        assertEquals(1, analytics.getTopByRating().size());
        assertEquals(1, analytics.getDailyCounts().size());
    }

    // --- date parsing ---

    @Test
    void list_rejectsBadDateFormat() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.list(0, 20, null, null, null, null, "not-a-date", null));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void list_includesReportSummaryWhenReviewWasReported() {
        BookingReviewReport report = new BookingReviewReport();
        report.setId(30L);
        report.setReview(sampleReview);
        report.setProfessional(professionalProfile);
        report.setReason(BookingReviewReportReason.OFFENSIVE);
        report.setNote("Texto ofensivo");
        report.setStatus(BookingReviewReportStatus.OPEN);
        report.setCreatedAt(LocalDateTime.of(2026, 3, 21, 12, 0));

        Page<BookingReview> page = new PageImpl<>(List.of(sampleReview), PageRequest.of(0, 20), 1);
        when(bookingReviewRepository.findAllFiltered(any(), any(), any(), any(), any(), any(), any()))
            .thenReturn(page);
        when(bookingReviewReportRepository.findByReview_IdInOrderByCreatedAtDescIdDesc(any()))
            .thenReturn(List.of(report));

        Page<InternalReviewListItemResponse> result = service.list(0, 20, null, null, null, null, null, null);

        InternalReviewListItemResponse item = result.getContent().get(0);
        assertTrue(item.isReported());
        assertEquals(1L, item.getReportCount());
        assertNotNull(item.getLatestReport());
        assertEquals(BookingReviewReportReason.OFFENSIVE, item.getLatestReport().getReason());
    }
}

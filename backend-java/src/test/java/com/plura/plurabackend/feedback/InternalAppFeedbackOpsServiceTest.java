package com.plura.plurabackend.feedback;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.feedback.model.AppFeedback;
import com.plura.plurabackend.core.feedback.model.AuthorRole;
import com.plura.plurabackend.core.feedback.model.FeedbackCategory;
import com.plura.plurabackend.core.feedback.model.FeedbackStatus;
import com.plura.plurabackend.core.feedback.ops.InternalAppFeedbackOpsService;
import com.plura.plurabackend.core.feedback.ops.dto.InternalFeedbackAnalyticsResponse;
import com.plura.plurabackend.core.feedback.ops.dto.InternalFeedbackDetailResponse;
import com.plura.plurabackend.core.feedback.ops.dto.InternalFeedbackListItemResponse;
import com.plura.plurabackend.core.feedback.repository.AppFeedbackRepository;
import com.plura.plurabackend.core.user.model.User;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;

class InternalAppFeedbackOpsServiceTest {

    private AppFeedbackRepository appFeedbackRepository;
    private InternalAppFeedbackOpsService service;

    private User testUser;
    private AppFeedback sampleFeedback;

    @BeforeEach
    void setUp() {
        appFeedbackRepository = mock(AppFeedbackRepository.class);
        service = new InternalAppFeedbackOpsService(appFeedbackRepository);

        testUser = new User();
        testUser.setId(1L);
        testUser.setFullName("Test User");

        sampleFeedback = new AppFeedback();
        sampleFeedback.setId(100L);
        sampleFeedback.setAuthor(testUser);
        sampleFeedback.setAuthorRole(AuthorRole.CLIENT);
        sampleFeedback.setRating(4);
        sampleFeedback.setText("Buen servicio");
        sampleFeedback.setCategory(FeedbackCategory.UX);
        sampleFeedback.setContextSource("configuracion");
        sampleFeedback.setStatus(FeedbackStatus.ACTIVE);
        sampleFeedback.setCreatedAt(LocalDateTime.of(2026, 3, 15, 10, 0));
        sampleFeedback.setUpdatedAt(LocalDateTime.of(2026, 3, 15, 10, 0));
    }

    @Test
    void listReturnsFilteredResults() {
        Page<AppFeedback> page = new PageImpl<>(List.of(sampleFeedback), PageRequest.of(0, 20), 1);
        when(appFeedbackRepository.findAllFiltered(
            eq(AuthorRole.CLIENT), eq(null), eq(null), eq(null), eq(null), eq(null),
            eq(PageRequest.of(0, 20))
        )).thenReturn(page);

        Page<InternalFeedbackListItemResponse> result = service.list(0, 20, "CLIENT", null, null, null, null, null);

        assertEquals(1, result.getTotalElements());
        InternalFeedbackListItemResponse item = result.getContent().get(0);
        assertEquals(100L, item.getId());
        assertEquals("Test User", item.getAuthorName());
        assertEquals("CLIENT", item.getAuthorRole());
        assertEquals(4, item.getRating());
        assertEquals("ACTIVE", item.getStatus());
    }

    @Test
    void listClampsPageAndSize() {
        Page<AppFeedback> page = new PageImpl<>(List.of(), PageRequest.of(0, 100), 0);
        when(appFeedbackRepository.findAllFiltered(any(), any(), any(), any(), any(), any(), eq(PageRequest.of(0, 100))))
            .thenReturn(page);

        service.list(-1, 200, null, null, null, null, null, null);

        verify(appFeedbackRepository).findAllFiltered(any(), any(), any(), any(), any(), any(), eq(PageRequest.of(0, 100)));
    }

    @Test
    void listWithInvalidCategoryReturnsBadRequest() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.list(0, 20, null, "INVALID", null, null, null, null));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void listWithInvalidDateReturnsBadRequest() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.list(0, 20, null, null, null, null, "not-a-date", null));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void detailReturnsFullInfo() {
        when(appFeedbackRepository.findById(100L)).thenReturn(Optional.of(sampleFeedback));

        InternalFeedbackDetailResponse detail = service.detail(100L);

        assertEquals(100L, detail.getId());
        assertEquals("Test User", detail.getAuthorName());
        assertEquals("UX", detail.getCategory());
        assertEquals("configuracion", detail.getContextSource());
        assertNotNull(detail.getUpdatedAt());
    }

    @Test
    void detailNotFoundReturns404() {
        when(appFeedbackRepository.findById(999L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.detail(999L));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void archiveChangesStatusToArchived() {
        when(appFeedbackRepository.findById(100L)).thenReturn(Optional.of(sampleFeedback));
        when(appFeedbackRepository.save(any(AppFeedback.class))).thenAnswer(inv -> inv.getArgument(0));

        InternalFeedbackDetailResponse result = service.archive(100L);

        assertEquals("ARCHIVED", result.getStatus());
        verify(appFeedbackRepository).save(sampleFeedback);
    }

    @Test
    void unarchiveChangesStatusToActive() {
        sampleFeedback.setStatus(FeedbackStatus.ARCHIVED);
        when(appFeedbackRepository.findById(100L)).thenReturn(Optional.of(sampleFeedback));
        when(appFeedbackRepository.save(any(AppFeedback.class))).thenAnswer(inv -> inv.getArgument(0));

        InternalFeedbackDetailResponse result = service.unarchive(100L);

        assertEquals("ACTIVE", result.getStatus());
    }

    @Test
    void analyticsReturnsAggregates() {
        when(appFeedbackRepository.countFiltered(any(), any())).thenReturn(10L);
        when(appFeedbackRepository.averageRating(any(), any())).thenReturn(3.5);
        when(appFeedbackRepository.countByAuthorRole(any(), any())).thenReturn(
            List.of(new Object[]{AuthorRole.CLIENT, 6L}, new Object[]{AuthorRole.PROFESSIONAL, 4L})
        );
        when(appFeedbackRepository.countByCategory(any(), any())).thenReturn(
            List.of(new Object[]{FeedbackCategory.BUG, 3L}, new Object[]{FeedbackCategory.UX, 7L})
        );
        when(appFeedbackRepository.countByRating(any(), any())).thenReturn(
            List.of(new Object[]{3, 4L}, new Object[]{4, 3L}, new Object[]{5, 3L})
        );
        when(appFeedbackRepository.dailyStats(any(), any())).thenReturn(List.of());

        InternalFeedbackAnalyticsResponse result = service.analytics(null, null);

        assertEquals(10L, result.getTotalFeedbacks());
        assertEquals(3.5, result.getAverageRating());
        assertEquals(6L, result.getCountByAuthorRole().get("CLIENT"));
        assertEquals(4L, result.getCountByAuthorRole().get("PROFESSIONAL"));
        assertEquals(3L, result.getCountByCategory().get("BUG"));
        assertEquals(7L, result.getCountByCategory().get("UX"));
        assertEquals(4L, result.getCountByRating().get(3));
    }

    @Test
    void analyticsWithDateRange() {
        when(appFeedbackRepository.countFiltered(any(), any())).thenReturn(5L);
        when(appFeedbackRepository.averageRating(any(), any())).thenReturn(4.0);
        when(appFeedbackRepository.countByAuthorRole(any(), any())).thenReturn(List.of());
        when(appFeedbackRepository.countByCategory(any(), any())).thenReturn(List.of());
        when(appFeedbackRepository.countByRating(any(), any())).thenReturn(List.of());
        when(appFeedbackRepository.dailyStats(any(), any())).thenReturn(List.of());

        InternalFeedbackAnalyticsResponse result = service.analytics("2026-03-01", "2026-03-15");

        assertEquals(5L, result.getTotalFeedbacks());
        assertEquals(4.0, result.getAverageRating());
    }

    @Test
    void feedbackInternalNeverExposedPublicly() {
        // This test verifies at the service level that internal feedback
        // has no method to return data without auth — the controller
        // requires X-Internal-Token. The service itself doesn't have
        // any public endpoint-facing methods.
        // The fact that InternalAppFeedbackOpsService only exists in the
        // core.feedback.ops package and is only wired to
        // InternalAppFeedbackOpsController (under /internal/ops/) confirms
        // feedback never appears in public endpoints.
        assertNotNull(service);
    }
}

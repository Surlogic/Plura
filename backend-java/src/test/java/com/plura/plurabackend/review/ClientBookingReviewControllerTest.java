package com.plura.plurabackend.review;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.review.BookingReviewEligibilityService;
import com.plura.plurabackend.core.review.BookingReviewService;
import com.plura.plurabackend.core.review.controller.ClientBookingReviewController;
import com.plura.plurabackend.core.review.dto.BookingReviewLookupResponse;
import com.plura.plurabackend.core.review.dto.BookingReviewResponse;
import com.plura.plurabackend.core.security.CurrentActorService;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

/**
 * Tests de resenas y moderacion.
 * Cubren escenarios de cliente reserva resena controller para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class ClientBookingReviewControllerTest {

    private BookingReviewService bookingReviewService;
    private CurrentActorService currentActorService;
    private ClientBookingReviewController controller;

    /**
     * Prepara mocks, datos base o configuracion comun antes de cada caso de prueba.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @BeforeEach
    void setUp() {
        bookingReviewService = mock(BookingReviewService.class);
        BookingReviewEligibilityService eligibilityService = mock(BookingReviewEligibilityService.class);
        currentActorService = mock(CurrentActorService.class);
        controller = new ClientBookingReviewController(bookingReviewService, eligibilityService, currentActorService);
    }

    /**
     * Escenario: get resena verifica que devuelva explicit faltante contract.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void getReviewReturnsExplicitMissingContract() {
        when(currentActorService.currentClientUserId()).thenReturn(10L);
        when(bookingReviewService.getReviewByBookingId(1L, 10L)).thenReturn(Optional.empty());

        ResponseEntity<BookingReviewLookupResponse> response = controller.getReview(1L);

        assertTrue(response.getStatusCode().is2xxSuccessful());
        assertFalse(response.getBody().isExists());
    }

    /**
     * Escenario: get resena verifica que devuelva explicit encontrado contract.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void getReviewReturnsExplicitFoundContract() {
        when(currentActorService.currentClientUserId()).thenReturn(10L);
        BookingReviewResponse review = new BookingReviewResponse(
            1L,
            2L,
            3L,
            5,
            "Excelente",
            "Cliente Test",
            false,
            false,
            LocalDateTime.now(),
            LocalDateTime.now()
        );
        when(bookingReviewService.getReviewByBookingId(2L, 10L)).thenReturn(Optional.of(review));

        ResponseEntity<BookingReviewLookupResponse> response = controller.getReview(2L);

        assertTrue(response.getBody().isExists());
        assertTrue(response.getBody().getReview() != null);
    }
}

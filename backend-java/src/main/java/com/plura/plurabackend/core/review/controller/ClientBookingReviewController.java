package com.plura.plurabackend.core.review.controller;

import com.plura.plurabackend.core.review.BookingReviewEligibilityService;
import com.plura.plurabackend.core.review.BookingReviewService;
import com.plura.plurabackend.core.review.dto.BookingReviewLookupResponse;
import com.plura.plurabackend.core.review.dto.BookingReviewResponse;
import com.plura.plurabackend.core.review.dto.CreateBookingReviewRequest;
import com.plura.plurabackend.core.review.dto.ReviewEligibilityResponse;
import com.plura.plurabackend.core.security.CurrentActorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * ClientBookingReviewController es un controlador REST del modulo resenas / controladores.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /cliente/reservas y deja la logica pesada en servicios.
 * Foco funcional: reservas, clientes, resenas.
 */
@RestController
@RequestMapping("/cliente/reservas")
public class ClientBookingReviewController {

    private final BookingReviewService bookingReviewService;
    private final BookingReviewEligibilityService bookingReviewEligibilityService;
    private final CurrentActorService currentActorService;

    public ClientBookingReviewController(
        BookingReviewService bookingReviewService,
        BookingReviewEligibilityService bookingReviewEligibilityService,
        CurrentActorService currentActorService
    ) {
        this.bookingReviewService = bookingReviewService;
        this.bookingReviewEligibilityService = bookingReviewEligibilityService;
        this.currentActorService = currentActorService;
    }

    /**
     * Verifica eligibility y devuelve el resultado de la validacion.
     */
    @GetMapping("/{bookingId}/review-eligibility")
    public ReviewEligibilityResponse checkEligibility(@PathVariable Long bookingId) {
        Long clientUserId = currentActorService.currentClientUserId();
        return bookingReviewEligibilityService.checkEligibility(bookingId, clientUserId);
    }

    /**
     * Endpoint POST /{bookingId}/review: Crea resena validando datos de entrada y persistiendo el resultado.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @PostMapping("/{bookingId}/review")
    public ResponseEntity<BookingReviewResponse> createReview(
        @PathVariable Long bookingId,
        @Valid @RequestBody CreateBookingReviewRequest request
    ) {
        Long clientUserId = currentActorService.currentClientUserId();
        BookingReviewResponse response = bookingReviewService.createReview(bookingId, clientUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Endpoint DELETE /{bookingId}/review: Elimina resena y limpia relaciones o datos derivados cuando corresponde.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @DeleteMapping("/{bookingId}/review")
    public ResponseEntity<Void> deleteReview(@PathVariable Long bookingId) {
        Long clientUserId = currentActorService.currentClientUserId();
        bookingReviewService.deleteReviewByBookingId(bookingId, clientUserId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{bookingId}/review")
    public ResponseEntity<BookingReviewLookupResponse> getReview(@PathVariable Long bookingId) {
        Long clientUserId = currentActorService.currentClientUserId();
        return bookingReviewService.getReviewByBookingId(bookingId, clientUserId)
            .map(BookingReviewLookupResponse::found)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.ok(BookingReviewLookupResponse.missing()));
    }
}

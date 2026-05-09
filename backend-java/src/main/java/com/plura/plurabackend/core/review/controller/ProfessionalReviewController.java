package com.plura.plurabackend.core.review.controller;

import com.plura.plurabackend.core.review.BookingReviewService;
import com.plura.plurabackend.core.review.dto.BookingReviewReportResponse;
import com.plura.plurabackend.core.review.dto.BookingReviewResponse;
import com.plura.plurabackend.core.review.dto.CreateBookingReviewReportRequest;
import com.plura.plurabackend.core.security.CurrentActorService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * ProfessionalReviewController es un controlador REST del modulo resenas / controladores.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /profesional/reviews y deja la logica pesada en servicios.
 * Foco funcional: profesionales, resenas.
 */
@RestController
@RequestMapping("/profesional/reviews")
public class ProfessionalReviewController {

    private final BookingReviewService bookingReviewService;
    private final CurrentActorService currentActorService;

    public ProfessionalReviewController(
        BookingReviewService bookingReviewService,
        CurrentActorService currentActorService
    ) {
        this.bookingReviewService = bookingReviewService;
        this.currentActorService = currentActorService;
    }

    /**
     * Devuelve el listado de resenas aplicando permisos y filtros del caso de uso.
     */
    @GetMapping
    public Page<BookingReviewResponse> listReviews(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Long professionalUserId = currentActorService.currentProfessionalUserId();
        int safeSize = Math.min(Math.max(size, 1), 50);
        return bookingReviewService.listProfessionalReviews(professionalUserId, PageRequest.of(page, safeSize));
    }

    /**
     * Ejecuta la logica de hide text manteniendola encapsulada en este componente.
     */
    @PatchMapping("/{reviewId}/hide-text")
    public ResponseEntity<Void> hideText(@PathVariable Long reviewId) {
        Long professionalUserId = currentActorService.currentProfessionalUserId();
        bookingReviewService.hideReviewText(reviewId, professionalUserId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Ejecuta la logica de show text manteniendola encapsulada en este componente.
     */
    @PatchMapping("/{reviewId}/show-text")
    public ResponseEntity<Void> showText(@PathVariable Long reviewId) {
        Long professionalUserId = currentActorService.currentProfessionalUserId();
        bookingReviewService.showReviewText(reviewId, professionalUserId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Ejecuta la logica de report resena manteniendola encapsulada en este componente.
     */
    @PostMapping("/{reviewId}/report")
    public ResponseEntity<BookingReviewReportResponse> reportReview(
        @PathVariable Long reviewId,
        @Valid @RequestBody CreateBookingReviewReportRequest request
    ) {
        Long professionalUserId = currentActorService.currentProfessionalUserId();
        BookingReviewReportResponse response = bookingReviewService.reportReview(reviewId, professionalUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}

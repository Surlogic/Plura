package com.plura.plurabackend.core.review.controller;

import com.plura.plurabackend.core.review.BookingReviewEligibilityService;
import com.plura.plurabackend.core.review.BookingReviewService;
import com.plura.plurabackend.core.review.dto.BookingReviewResponse;
import com.plura.plurabackend.core.review.dto.CreateBookingReviewRequest;
import com.plura.plurabackend.core.review.dto.ReviewEligibilityResponse;
import com.plura.plurabackend.core.security.CurrentActorService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    @GetMapping("/{bookingId}/review-eligibility")
    public ReviewEligibilityResponse checkEligibility(@PathVariable Long bookingId) {
        Long clientUserId = currentActorService.currentClientUserId();
        return bookingReviewEligibilityService.checkEligibility(bookingId, clientUserId);
    }

    @PostMapping("/{bookingId}/review")
    public ResponseEntity<BookingReviewResponse> createReview(
        @PathVariable Long bookingId,
        @Valid @RequestBody CreateBookingReviewRequest request
    ) {
        Long clientUserId = currentActorService.currentClientUserId();
        BookingReviewResponse response = bookingReviewService.createReview(bookingId, clientUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{bookingId}/review")
    public ResponseEntity<?> getReview(@PathVariable Long bookingId) {
        Long clientUserId = currentActorService.currentClientUserId();
        return bookingReviewService.getReviewByBookingId(bookingId, clientUserId)
            .<ResponseEntity<?>>map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.ok(Map.of("exists", false)));
    }
}

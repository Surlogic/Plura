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

    @GetMapping
    public Page<BookingReviewResponse> listReviews(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Long professionalUserId = currentActorService.currentProfessionalUserId();
        int safeSize = Math.min(Math.max(size, 1), 50);
        return bookingReviewService.listProfessionalReviews(professionalUserId, PageRequest.of(page, safeSize));
    }

    @PatchMapping("/{reviewId}/hide-text")
    public ResponseEntity<Void> hideText(@PathVariable Long reviewId) {
        Long professionalUserId = currentActorService.currentProfessionalUserId();
        bookingReviewService.hideReviewText(reviewId, professionalUserId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{reviewId}/show-text")
    public ResponseEntity<Void> showText(@PathVariable Long reviewId) {
        Long professionalUserId = currentActorService.currentProfessionalUserId();
        bookingReviewService.showReviewText(reviewId, professionalUserId);
        return ResponseEntity.noContent().build();
    }

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

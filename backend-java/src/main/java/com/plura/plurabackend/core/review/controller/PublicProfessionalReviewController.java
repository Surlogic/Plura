package com.plura.plurabackend.core.review.controller;

import com.plura.plurabackend.core.review.BookingReviewService;
import com.plura.plurabackend.core.review.dto.BookingReviewResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/profesionales")
public class PublicProfessionalReviewController {

    private final BookingReviewService bookingReviewService;

    public PublicProfessionalReviewController(BookingReviewService bookingReviewService) {
        this.bookingReviewService = bookingReviewService;
    }

    @GetMapping("/{slug}/reviews")
    public Page<BookingReviewResponse> listReviews(
        @PathVariable String slug,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        return bookingReviewService.listPublicReviews(slug, PageRequest.of(page, safeSize));
    }
}

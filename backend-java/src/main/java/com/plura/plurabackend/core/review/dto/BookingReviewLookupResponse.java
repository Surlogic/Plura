package com.plura.plurabackend.core.review.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BookingReviewLookupResponse {
    private boolean exists;
    private BookingReviewResponse review;

    public static BookingReviewLookupResponse missing() {
        return new BookingReviewLookupResponse(false, null);
    }

    public static BookingReviewLookupResponse found(BookingReviewResponse review) {
        return new BookingReviewLookupResponse(true, review);
    }
}

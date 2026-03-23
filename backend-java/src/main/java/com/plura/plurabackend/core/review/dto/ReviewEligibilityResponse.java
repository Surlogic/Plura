package com.plura.plurabackend.core.review.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ReviewEligibilityResponse {
    private boolean eligible;
    private boolean alreadyReviewed;
    private String reason;
}

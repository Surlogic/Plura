package com.plura.plurabackend.core.review.dto;

import com.plura.plurabackend.core.review.model.BookingReviewReportReason;
import com.plura.plurabackend.core.review.model.BookingReviewReportStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ReviewReportSummaryResponse {
    private Long id;
    private BookingReviewReportReason reason;
    private String note;
    private BookingReviewReportStatus status;
    private String createdAt;
    private String resolvedAt;
}

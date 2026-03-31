package com.plura.plurabackend.core.review.dto;

import com.plura.plurabackend.core.review.model.BookingReviewReportReason;
import com.plura.plurabackend.core.review.model.BookingReviewReportStatus;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BookingReviewReportResponse {
    private Long id;
    private Long reviewId;
    private Long professionalId;
    private BookingReviewReportReason reason;
    private String note;
    private BookingReviewReportStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
}

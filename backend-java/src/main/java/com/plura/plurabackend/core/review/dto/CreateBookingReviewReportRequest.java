package com.plura.plurabackend.core.review.dto;

import com.plura.plurabackend.core.review.model.BookingReviewReportReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateBookingReviewReportRequest {

    @NotNull
    private BookingReviewReportReason reason;

    @Size(max = 1000)
    private String note;
}

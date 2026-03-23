package com.plura.plurabackend.core.review.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BookingReviewResponse {
    private Long id;
    private Long bookingId;
    private Long professionalId;
    private Integer rating;
    private String text;
    private String authorDisplayName;
    private boolean textHiddenByProfessional;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

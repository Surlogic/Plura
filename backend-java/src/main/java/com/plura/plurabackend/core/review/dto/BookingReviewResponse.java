package com.plura.plurabackend.review.dto;

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
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String businessReplyText;
    private LocalDateTime businessRepliedAt;
}
package com.plura.plurabackend.core.review.ops.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class InternalReviewDetailResponse {
    private Long id;
    private Long bookingId;
    private Long professionalId;
    private String professionalName;
    private String professionalSlug;
    private Long clientUserId;
    private String clientName;
    private Integer rating;
    private String text;
    private boolean textHiddenByProfessional;
    private String textHiddenAt;
    private boolean textHiddenByInternalOps;
    private String internalModerationNote;
    private String createdAt;
    private String updatedAt;
}

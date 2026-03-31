package com.plura.plurabackend.core.review.ops.dto;

import com.plura.plurabackend.core.review.dto.ReviewReportSummaryResponse;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class InternalReviewListItemResponse {
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
    private boolean textHiddenByInternalOps;
    private boolean reported;
    private long reportCount;
    private ReviewReportSummaryResponse latestReport;
    private String internalModerationNote;
    private String createdAt;
}

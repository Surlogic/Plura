package com.plura.plurabackend.core.feedback.ops.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class InternalFeedbackListItemResponse {
    private Long id;
    private Long authorUserId;
    private String authorName;
    private String authorRole;
    private Integer rating;
    private String text;
    private String category;
    private String contextSource;
    private String status;
    private String createdAt;
}

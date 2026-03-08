package com.plura.plurabackend.booking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingRefundRecordResponse {
    private String id;
    private String actorType;
    private Long actorUserId;
    private BigDecimal requestedAmount;
    private BigDecimal targetAmount;
    private String status;
    private String reasonCode;
    private String currency;
    private String providerReference;
    private String relatedDecisionId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

package com.plura.plurabackend.core.booking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingActionDecisionResponse {
    private String id;
    private String actionType;
    private String actorType;
    private String statusBefore;
    private String statusAfter;
    private BigDecimal refundPreviewAmount;
    private BigDecimal retainPreviewAmount;
    private String currency;
    private String financialOutcomeCode;
    private List<String> reasonCodes;
    private String messageCode;
    private Map<String, String> messageParams;
    private String plainTextFallback;
    private LocalDateTime createdAt;
}

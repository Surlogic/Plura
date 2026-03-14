package com.plura.plurabackend.core.booking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingPayoutRecordResponse {
    private String id;
    private Long professionalId;
    private BigDecimal targetAmount;
    private BigDecimal releasedAmount;
    private String currency;
    private String status;
    private String reasonCode;
    private String provider;
    private String providerReference;
    private String relatedDecisionId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime executedAt;
    private LocalDateTime failedAt;
}

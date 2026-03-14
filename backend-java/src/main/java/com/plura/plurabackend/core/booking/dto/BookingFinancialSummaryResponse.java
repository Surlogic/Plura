package com.plura.plurabackend.core.booking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingFinancialSummaryResponse {
    private BigDecimal amountCharged;
    private BigDecimal amountHeld;
    private BigDecimal amountToRefund;
    private BigDecimal amountRefunded;
    private BigDecimal amountToRelease;
    private BigDecimal amountReleased;
    private String currency;
    private String financialStatus;
    private String lastDecisionId;
    private LocalDateTime updatedAt;
}

package com.plura.plurabackend.core.booking.dto;

import java.math.BigDecimal;
import com.plura.plurabackend.core.booking.model.BookingProcessingFeeMode;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingPaymentBreakdownResponse {
    private BigDecimal prepaidBaseAmount;
    private BigDecimal processingFeeAmount;
    private BigDecimal totalAmount;
    private String currency;
    private String processingFeeLabel;
    private BookingProcessingFeeMode processingFeeMode;
    private BigDecimal providerFeePercent;
    private BigDecimal taxPercent;
    private BigDecimal platformFeePercent;
}

package com.plura.plurabackend.booking.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingPaymentSessionResponse {
    private Long bookingId;
    private String transactionId;
    private String provider;
    private String checkoutUrl;
    private BigDecimal amount;
    private String currency;
    private String financialStatus;
}

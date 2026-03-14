package com.plura.plurabackend.core.booking.finance;

import com.plura.plurabackend.core.booking.finance.model.BookingFinancialStatus;
import java.math.BigDecimal;

public record BookingFinancialEvidenceSnapshot(
    BigDecimal amountCharged,
    BigDecimal amountHeld,
    BigDecimal amountToRefund,
    BigDecimal amountRefunded,
    BigDecimal amountToRelease,
    BigDecimal amountReleased,
    BookingFinancialStatus financialStatus,
    boolean hasFailedCharge,
    boolean hasFailedRefund,
    boolean hasFailedPayout
) {}

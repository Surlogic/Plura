package com.plura.plurabackend.core.booking.finance;

import com.plura.plurabackend.core.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.core.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.core.booking.finance.model.BookingRefundRecord;

public record BookingFinanceUpdateResult(
    BookingFinancialSummary summary,
    BookingRefundRecord refundRecord,
    BookingPayoutRecord payoutRecord
) {}

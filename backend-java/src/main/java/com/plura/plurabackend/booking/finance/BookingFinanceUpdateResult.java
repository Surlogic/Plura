package com.plura.plurabackend.booking.finance;

import com.plura.plurabackend.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.booking.finance.model.BookingRefundRecord;

public record BookingFinanceUpdateResult(
    BookingFinancialSummary summary,
    BookingRefundRecord refundRecord,
    BookingPayoutRecord payoutRecord
) {}

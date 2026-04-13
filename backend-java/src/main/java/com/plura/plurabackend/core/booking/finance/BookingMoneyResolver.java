package com.plura.plurabackend.core.booking.finance;

import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public class BookingMoneyResolver {

    private final BookingPaymentBreakdownService bookingPaymentBreakdownService;

    public BookingMoneyResolver(BookingPaymentBreakdownService bookingPaymentBreakdownService) {
        this.bookingPaymentBreakdownService = bookingPaymentBreakdownService;
    }

    public BigDecimal resolvePrepaidAmount(Booking booking) {
        if (booking == null) {
            return BigDecimal.ZERO;
        }
        ServicePaymentType paymentType = booking.getServicePaymentTypeSnapshot();
        if (paymentType == null || paymentType == ServicePaymentType.ON_SITE) {
            return BigDecimal.ZERO;
        }
        if (booking.getPrepaidTotalAmountSnapshot() != null) {
            return normalizeAmount(booking.getPrepaidTotalAmountSnapshot());
        }
        if (paymentType == ServicePaymentType.DEPOSIT) {
            return normalizeAmount(booking.getServiceDepositAmountSnapshot());
        }
        return normalizeAmount(booking.getServicePriceSnapshot());
    }

    public BigDecimal resolvePrepaidProcessingFeeAmount(Booking booking) {
        if (booking == null) {
            return BigDecimal.ZERO;
        }
        if (booking.getPrepaidProcessingFeeAmountSnapshot() != null) {
            return normalizeAmount(booking.getPrepaidProcessingFeeAmountSnapshot());
        }
        return bookingPaymentBreakdownService.quoteForBooking(booking).processingFeeAmount();
    }

    public String resolveCurrency(Booking booking) {
        if (booking == null || booking.getServiceCurrencySnapshot() == null || booking.getServiceCurrencySnapshot().isBlank()) {
            return "UYU";
        }
        return booking.getServiceCurrencySnapshot().trim().toUpperCase();
    }

    public BigDecimal normalizeAmount(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount.max(BigDecimal.ZERO);
    }
}

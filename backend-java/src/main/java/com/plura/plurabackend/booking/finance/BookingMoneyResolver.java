package com.plura.plurabackend.booking.finance;

import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.ServicePaymentType;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public class BookingMoneyResolver {

    public BigDecimal resolvePrepaidAmount(Booking booking) {
        if (booking == null) {
            return BigDecimal.ZERO;
        }
        ServicePaymentType paymentType = booking.getServicePaymentTypeSnapshot();
        if (paymentType == null || paymentType == ServicePaymentType.ON_SITE) {
            return BigDecimal.ZERO;
        }
        if (paymentType == ServicePaymentType.DEPOSIT) {
            return normalizeAmount(booking.getServiceDepositAmountSnapshot());
        }
        return normalizeAmount(booking.getServicePriceSnapshot());
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

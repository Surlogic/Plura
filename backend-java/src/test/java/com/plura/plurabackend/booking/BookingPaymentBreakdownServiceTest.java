package com.plura.plurabackend.booking;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.booking.finance.BookingPaymentBreakdownService;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class BookingPaymentBreakdownServiceTest {

    private final BillingProperties billingProperties = new BillingProperties();
    private final BookingPaymentBreakdownService service = new BookingPaymentBreakdownService(billingProperties);

    @BeforeEach
    void setUp() {
        billingProperties.setEnabled(true);
        billingProperties.getMercadopago().setEnabled(true);
        billingProperties.getMercadopago().getReservations().getProcessingFee().setEnabled(true);
        billingProperties.getMercadopago().getReservations().getProcessingFee().setLabel("Cargo de procesamiento");
        billingProperties.getMercadopago().getReservations().getProcessingFee().setInstantProviderFeePercent(
            new BigDecimal("5.99")
        );
        billingProperties.getMercadopago().getReservations().getProcessingFee().setDelayedProviderFeePercent(
            new BigDecimal("4.99")
        );
        billingProperties.getMercadopago().getReservations().getProcessingFee().setTaxPercent(
            new BigDecimal("22")
        );
        billingProperties.getMercadopago().getReservations().getProcessingFee().setPlatformFeePercent(
            new BigDecimal("1.00")
        );
    }

    @Test
    void shouldGrossUpFullPrepayUsingConfiguredProcessingFee() {
        Booking booking = booking(ServicePaymentType.FULL_PREPAY, new BigDecimal("100.00"), null);

        var breakdown = service.quoteForBooking(booking);

        assertMoney("100.00", breakdown.prepaidBaseAmount());
        assertMoney("9.07", breakdown.processingFeeAmount());
        assertMoney("109.07", breakdown.totalAmount());
        assertEquals("UYU", breakdown.currency());
    }

    @Test
    void shouldUseDelayedProcessingFeeModeWhenBookingSnapshotRequiresIt() {
        Booking booking = booking(ServicePaymentType.FULL_PREPAY, new BigDecimal("100.00"), null);
        booking.setPrepaidProcessingFeeModeSnapshot(
            com.plura.plurabackend.core.booking.model.BookingProcessingFeeMode.DELAYED_21_DAYS
        );

        var breakdown = service.quoteForBooking(booking);

        assertMoney("100.00", breakdown.prepaidBaseAmount());
        assertMoney("7.63", breakdown.processingFeeAmount());
        assertMoney("107.63", breakdown.totalAmount());
        assertEquals(
            com.plura.plurabackend.core.booking.model.BookingProcessingFeeMode.DELAYED_21_DAYS,
            breakdown.processingFeeMode()
        );
    }

    @Test
    void shouldReuseSnapshotAmountsWhenBookingAlreadyStoredThem() {
        Booking booking = booking(ServicePaymentType.DEPOSIT, new BigDecimal("100.00"), new BigDecimal("30.00"));
        booking.setPrepaidProcessingFeeAmountSnapshot(new BigDecimal("2.37"));
        booking.setPrepaidTotalAmountSnapshot(new BigDecimal("32.37"));

        var breakdown = service.quoteForBooking(booking);

        assertMoney("30.00", breakdown.prepaidBaseAmount());
        assertMoney("2.37", breakdown.processingFeeAmount());
        assertMoney("32.37", breakdown.totalAmount());
    }

    @Test
    void shouldReturnZeroFeeForOnSiteBookings() {
        Booking booking = booking(ServicePaymentType.ON_SITE, new BigDecimal("100.00"), null);

        var breakdown = service.quoteForBooking(booking);

        assertMoney("0.00", breakdown.prepaidBaseAmount());
        assertMoney("0.00", breakdown.processingFeeAmount());
        assertMoney("0.00", breakdown.totalAmount());
    }

    private Booking booking(
        ServicePaymentType paymentType,
        BigDecimal servicePrice,
        BigDecimal depositAmount
    ) {
        Booking booking = new Booking();
        booking.setServicePaymentTypeSnapshot(paymentType);
        booking.setServicePriceSnapshot(servicePrice);
        booking.setServiceDepositAmountSnapshot(depositAmount);
        booking.setServiceCurrencySnapshot("UYU");
        return booking;
    }

    private void assertMoney(String expected, BigDecimal actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual));
    }
}

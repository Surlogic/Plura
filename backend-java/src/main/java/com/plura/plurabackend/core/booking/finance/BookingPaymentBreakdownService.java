package com.plura.plurabackend.core.booking.finance;

import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.booking.dto.BookingPaymentBreakdownResponse;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingProcessingFeeMode;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Service;

@Service
public class BookingPaymentBreakdownService {

    private static final int MONEY_SCALE = 2;
    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    private final BillingProperties billingProperties;

    public BookingPaymentBreakdownService(BillingProperties billingProperties) {
        this.billingProperties = billingProperties;
    }

    public BookingPaymentBreakdown quoteForService(ProfesionalService service) {
        if (service == null) {
            return BookingPaymentBreakdown.empty("UYU", processingFeeLabel());
        }
        return buildBreakdown(
            resolvePaymentType(service.getPaymentType()),
            resolveProcessingFeeMode(service.getProcessingFeeMode()),
            normalizeAmount(service.getDepositAmount()),
            parseAmount(service.getPrice()),
            normalizeCurrency(service.getCurrency())
        );
    }

    public BookingPaymentBreakdown quoteForBooking(Booking booking) {
        if (booking == null) {
            return BookingPaymentBreakdown.empty("UYU", processingFeeLabel());
        }

        String currency = normalizeCurrency(booking.getServiceCurrencySnapshot());
        if (booking.getPrepaidTotalAmountSnapshot() != null || booking.getPrepaidProcessingFeeAmountSnapshot() != null) {
            BigDecimal prepaidBaseAmount = resolveBasePrepaidAmount(booking);
            BigDecimal processingFeeAmount = normalizeAmount(booking.getPrepaidProcessingFeeAmountSnapshot());
            BigDecimal totalAmount = booking.getPrepaidTotalAmountSnapshot() == null
                ? normalizeMoney(prepaidBaseAmount.add(processingFeeAmount))
                : normalizeAmount(booking.getPrepaidTotalAmountSnapshot());
            return new BookingPaymentBreakdown(
                prepaidBaseAmount,
                processingFeeAmount,
                totalAmount,
                currency,
                processingFeeLabel(),
                resolveProcessingFeeMode(booking.getPrepaidProcessingFeeModeSnapshot()),
                providerFeePercent(resolveProcessingFeeMode(booking.getPrepaidProcessingFeeModeSnapshot())),
                taxPercent(),
                platformFeePercent()
            );
        }

        return buildBreakdown(
            booking.getServicePaymentTypeSnapshot(),
            resolveProcessingFeeMode(booking.getPrepaidProcessingFeeModeSnapshot()),
            normalizeAmount(booking.getServiceDepositAmountSnapshot()),
            normalizeAmount(booking.getServicePriceSnapshot()),
            currency
        );
    }

    public BookingPaymentBreakdownResponse toResponse(BookingPaymentBreakdown breakdown) {
        if (breakdown == null) {
            return null;
        }
        return new BookingPaymentBreakdownResponse(
            breakdown.prepaidBaseAmount(),
            breakdown.processingFeeAmount(),
            breakdown.totalAmount(),
            breakdown.currency(),
            breakdown.processingFeeLabel(),
            breakdown.processingFeeMode(),
            breakdown.providerFeePercent(),
            breakdown.taxPercent(),
            breakdown.platformFeePercent()
        );
    }

    private BookingPaymentBreakdown buildBreakdown(
        ServicePaymentType paymentType,
        BookingProcessingFeeMode processingFeeMode,
        BigDecimal depositAmount,
        BigDecimal servicePrice,
        String currency
    ) {
        BigDecimal prepaidBaseAmount = switch (paymentType == null ? ServicePaymentType.ON_SITE : paymentType) {
            case ON_SITE -> BigDecimal.ZERO;
            case DEPOSIT -> depositAmount;
            case FULL_PREPAY -> servicePrice;
        };

        prepaidBaseAmount = normalizeAmount(prepaidBaseAmount);
        if (prepaidBaseAmount.signum() <= 0 || !processingFeeEnabled()) {
            return new BookingPaymentBreakdown(
                prepaidBaseAmount,
                BigDecimal.ZERO,
                prepaidBaseAmount,
                currency,
                processingFeeLabel(),
                processingFeeMode,
                providerFeePercent(processingFeeMode),
                taxPercent(),
                platformFeePercent()
            );
        }

        BigDecimal effectivePercent = effectiveProcessingFeePercent(processingFeeMode);
        if (effectivePercent.signum() <= 0) {
            return new BookingPaymentBreakdown(
                prepaidBaseAmount,
                BigDecimal.ZERO,
                prepaidBaseAmount,
                currency,
                processingFeeLabel(),
                processingFeeMode,
                providerFeePercent(processingFeeMode),
                taxPercent(),
                platformFeePercent()
            );
        }

        BigDecimal divisor = BigDecimal.ONE.subtract(effectivePercent.divide(ONE_HUNDRED, 8, RoundingMode.HALF_UP));
        BigDecimal totalAmount = prepaidBaseAmount.divide(divisor, MONEY_SCALE, RoundingMode.UP);
        BigDecimal processingFeeAmount = normalizeMoney(totalAmount.subtract(prepaidBaseAmount));

        return new BookingPaymentBreakdown(
            prepaidBaseAmount,
            processingFeeAmount,
            normalizeMoney(prepaidBaseAmount.add(processingFeeAmount)),
            currency,
            processingFeeLabel(),
            processingFeeMode,
            providerFeePercent(processingFeeMode),
            taxPercent(),
            platformFeePercent()
        );
    }

    private ServicePaymentType resolvePaymentType(ServicePaymentType paymentType) {
        return paymentType == null ? ServicePaymentType.ON_SITE : paymentType;
    }

    private BookingProcessingFeeMode resolveProcessingFeeMode(BookingProcessingFeeMode processingFeeMode) {
        return processingFeeMode == null ? BookingProcessingFeeMode.INSTANT : processingFeeMode;
    }

    private BigDecimal resolveBasePrepaidAmount(Booking booking) {
        if (booking.getServicePaymentTypeSnapshot() == ServicePaymentType.DEPOSIT) {
            return normalizeAmount(booking.getServiceDepositAmountSnapshot());
        }
        if (booking.getServicePaymentTypeSnapshot() == ServicePaymentType.ON_SITE) {
            return BigDecimal.ZERO;
        }
        return normalizeAmount(booking.getServicePriceSnapshot());
    }

    private BigDecimal parseAmount(String rawAmount) {
        if (rawAmount == null || rawAmount.isBlank()) {
            return BigDecimal.ZERO;
        }
        try {
            return normalizeMoney(new BigDecimal(rawAmount.trim()));
        } catch (NumberFormatException exception) {
            return BigDecimal.ZERO;
        }
    }

    private boolean processingFeeEnabled() {
        return billingProperties.getMercadopago().getReservations().getProcessingFee().isEnabled();
    }

    private BigDecimal effectiveProcessingFeePercent(BookingProcessingFeeMode mode) {
        BillingProperties.MercadoPago.ProcessingFee config =
            billingProperties.getMercadopago().getReservations().getProcessingFee();
        BigDecimal providerFeePercent = normalizePercentage(config.resolveProviderFeePercent(resolveProcessingFeeMode(mode)));
        BigDecimal taxPercent = normalizePercentage(config.getTaxPercent());
        BigDecimal platformFeePercent = normalizePercentage(config.getPlatformFeePercent());
        BigDecimal taxMultiplier = BigDecimal.ONE.add(taxPercent.divide(ONE_HUNDRED, 8, RoundingMode.HALF_UP));
        return providerFeePercent.multiply(taxMultiplier).add(platformFeePercent).setScale(4, RoundingMode.HALF_UP);
    }

    private String processingFeeLabel() {
        return billingProperties.getMercadopago().getReservations().getProcessingFee().getLabel();
    }

    private BigDecimal providerFeePercent(BookingProcessingFeeMode mode) {
        return normalizePercentage(
            billingProperties.getMercadopago().getReservations().getProcessingFee().resolveProviderFeePercent(
                resolveProcessingFeeMode(mode)
            )
        ).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal taxPercent() {
        return normalizePercentage(
            billingProperties.getMercadopago().getReservations().getProcessingFee().getTaxPercent()
        ).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal platformFeePercent() {
        return normalizePercentage(
            billingProperties.getMercadopago().getReservations().getProcessingFee().getPlatformFeePercent()
        ).setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeCurrency(String currency) {
        return currency == null || currency.isBlank() ? "UYU" : currency.trim().toUpperCase();
    }

    private BigDecimal normalizePercentage(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.max(BigDecimal.ZERO);
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : normalizeMoney(amount.max(BigDecimal.ZERO));
    }

    private BigDecimal normalizeMoney(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    public record BookingPaymentBreakdown(
        BigDecimal prepaidBaseAmount,
        BigDecimal processingFeeAmount,
        BigDecimal totalAmount,
        String currency,
        String processingFeeLabel,
        BookingProcessingFeeMode processingFeeMode,
        BigDecimal providerFeePercent,
        BigDecimal taxPercent,
        BigDecimal platformFeePercent
    ) {
        public static BookingPaymentBreakdown empty(String currency, String processingFeeLabel) {
            return new BookingPaymentBreakdown(
                BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP),
                BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP),
                BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP),
                currency == null || currency.isBlank() ? "UYU" : currency,
                processingFeeLabel == null || processingFeeLabel.isBlank() ? "Cargo de procesamiento" : processingFeeLabel,
                BookingProcessingFeeMode.INSTANT,
                BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP),
                BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP),
                BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP)
            );
        }
    }
}

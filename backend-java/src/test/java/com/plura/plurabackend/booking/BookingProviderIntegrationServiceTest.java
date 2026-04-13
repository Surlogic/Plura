package com.plura.plurabackend.booking;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import com.plura.plurabackend.professional.application.ProfessionalSideEffectCoordinator;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.analytics.tracking.AppProductEventTrackingService;
import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.payments.model.PaymentEvent;
import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransactionStatus;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransactionType;
import com.plura.plurabackend.core.billing.payments.provider.PaymentProviderClient;
import com.plura.plurabackend.core.billing.payments.provider.ProviderCheckoutSession;
import com.plura.plurabackend.core.billing.payments.provider.ProviderVerificationResult;
import com.plura.plurabackend.core.billing.payments.repository.PaymentTransactionRepository;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperation;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationStatus;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationType;
import com.plura.plurabackend.core.billing.providerops.ProviderOperationService;
import com.plura.plurabackend.core.billing.providerops.ProviderOperationWorker;
import com.plura.plurabackend.core.booking.bridge.BookingProfessionalPlanGateway;
import com.plura.plurabackend.core.booking.dto.BookingPaymentSessionResponse;
import com.plura.plurabackend.core.booking.event.BookingEventService;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.event.model.BookingEventType;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.finance.BookingMoneyResolver;
import com.plura.plurabackend.core.booking.finance.BookingPaymentBreakdownService;
import com.plura.plurabackend.core.booking.finance.BookingProviderIntegrationService;
import com.plura.plurabackend.core.booking.finance.model.BookingFinancialStatus;
import com.plura.plurabackend.core.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.core.booking.finance.model.BookingRefundReasonCode;
import com.plura.plurabackend.core.booking.finance.model.BookingRefundRecord;
import com.plura.plurabackend.core.booking.finance.model.BookingRefundStatus;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.billing.webhooks.ParsedWebhookEvent;
import com.plura.plurabackend.core.billing.webhooks.WebhookEventDomain;
import com.plura.plurabackend.core.billing.webhooks.WebhookEventType;
import com.plura.plurabackend.core.notification.integration.billing.BillingNotificationIntegrationService;
import com.plura.plurabackend.core.notification.integration.booking.BookingNotificationIntegrationService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

class BookingProviderIntegrationServiceTest {

    private final BookingRepository bookingRepository = mock(BookingRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
        private final ProfessionalProfileRepository professionalProfileRepository = mock(ProfessionalProfileRepository.class);
        private final ProfessionalSideEffectCoordinator professionalSideEffectCoordinator = mock(ProfessionalSideEffectCoordinator.class);

    private final PaymentTransactionRepository paymentTransactionRepository = mock(PaymentTransactionRepository.class);
    private final BookingFinanceService bookingFinanceService = mock(BookingFinanceService.class);
    private final BookingEventService bookingEventService = mock(BookingEventService.class);
    private final BillingProperties billingProperties = new BillingProperties();
    private final BookingPaymentBreakdownService bookingPaymentBreakdownService =
        new BookingPaymentBreakdownService(billingProperties);
    private final BookingMoneyResolver bookingMoneyResolver = new BookingMoneyResolver(bookingPaymentBreakdownService);
    private final ProviderOperationService providerOperationService = mock(ProviderOperationService.class);
    private final ProviderOperationWorker providerOperationWorker = mock(ProviderOperationWorker.class);
    private final PaymentProviderClient providerClient = mock(PaymentProviderClient.class);
    private final BillingNotificationIntegrationService billingNotificationIntegrationService =
        mock(BillingNotificationIntegrationService.class);
    private final BookingNotificationIntegrationService bookingNotificationIntegrationService =
        mock(BookingNotificationIntegrationService.class);
    private final AppProductEventTrackingService appProductEventTrackingService =
        mock(AppProductEventTrackingService.class);
    private final BookingProfessionalPlanGateway bookingProfessionalPlanGateway = mock(BookingProfessionalPlanGateway.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final PlatformTransactionManager transactionManager = new PlatformTransactionManager() {
        @Override
        public TransactionStatus getTransaction(TransactionDefinition definition) {
            return new SimpleTransactionStatus();
        }

        @Override
        public void commit(TransactionStatus status) {
        }

        @Override
        public void rollback(TransactionStatus status) {
        }
    };

    @Test
    void shouldReusePendingMercadoPagoCheckoutSession() throws Exception {
        BookingProviderIntegrationService service = buildService();
        User user = clientUser();
        Booking booking = prepaidBooking();
        PaymentTransaction pendingCharge = new PaymentTransaction();
        pendingCharge.setId("tx-pending");
        pendingCharge.setBooking(booking);
        pendingCharge.setProfessionalId(booking.getProfessionalId());
        pendingCharge.setProvider(PaymentProvider.MERCADOPAGO);
        pendingCharge.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        pendingCharge.setStatus(PaymentTransactionStatus.PENDING);
        pendingCharge.setAmount(BigDecimal.valueOf(500));
        pendingCharge.setCurrency("UYU");
        pendingCharge.setExternalReference("booking:" + booking.getId());
        pendingCharge.setPayloadJson(objectMapper.writeValueAsString(
            new ProviderCheckoutSession("https://mp.test/checkout-1", "pref-1", null)
        ));

        when(userRepository.findByIdAndDeletedAtIsNull(user.getId())).thenReturn(Optional.of(user));
        when(bookingRepository.findDetailedByIdForUpdate(booking.getId())).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(
                PaymentTransactionStatus.APPROVED,
                PaymentTransactionStatus.PARTIALLY_REFUNDED,
                PaymentTransactionStatus.REFUNDED
            )
        )).thenReturn(List.of());
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(PaymentTransactionStatus.PENDING)
        )).thenReturn(List.of(pendingCharge));
        when(providerClient.verifyPayment(any())).thenReturn(new ProviderVerificationResult(
            false,
            "PENDING",
            BigDecimal.valueOf(500),
            "UYU",
            booking.getProfessionalId(),
            null,
            null,
            "debit_card",
            "visa"
        ));
        when(bookingProfessionalPlanGateway.allowsOnlinePayments(booking.getProfessionalId())).thenReturn(true);
        when(bookingFinanceService.ensureInitializedWithEvidence(booking))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.PAYMENT_PENDING));

        BookingPaymentSessionResponse response = service.createPaymentSessionForClient(
            String.valueOf(user.getId()),
            booking.getId(),
            null
        );

        assertEquals("tx-pending", response.getTransactionId());
        assertEquals("https://mp.test/checkout-1", response.getCheckoutUrl());
        assertEquals("MERCADOPAGO", response.getProvider());
        verify(providerClient, never()).createBookingCheckout(any());
    }

    @Test
    void shouldRotateLegacyPendingCheckoutToMercadoPagoRuntime() throws Exception {
        BookingProviderIntegrationService service = buildService();
        User user = clientUser();
        Booking booking = prepaidBooking();
        PaymentTransaction pendingCharge = new PaymentTransaction();
        pendingCharge.setId("tx-legacy-pending");
        pendingCharge.setBooking(booking);
        pendingCharge.setProfessionalId(booking.getProfessionalId());
        pendingCharge.setProvider(PaymentProvider.DLOCAL);
        pendingCharge.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        pendingCharge.setStatus(PaymentTransactionStatus.PENDING);
        pendingCharge.setAmount(BigDecimal.valueOf(500));
        pendingCharge.setCurrency("UYU");
        pendingCharge.setExternalReference("booking:" + booking.getId());
        pendingCharge.setProviderPaymentId("legacy-pref");
        pendingCharge.setPayloadJson("{\"checkoutUrl\":\"https://checkout.dlocal.test/legacy\"}");

        when(userRepository.findByIdAndDeletedAtIsNull(user.getId())).thenReturn(Optional.of(user));
        when(bookingRepository.findDetailedByIdForUpdate(booking.getId())).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(
                PaymentTransactionStatus.APPROVED,
                PaymentTransactionStatus.PARTIALLY_REFUNDED,
                PaymentTransactionStatus.REFUNDED
            )
        )).thenReturn(List.of());
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(PaymentTransactionStatus.PENDING)
        )).thenReturn(List.of(pendingCharge));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(providerClient.createBookingCheckout(any())).thenReturn(
            new ProviderCheckoutSession("https://mp.test/checkout-rotated", "pref-mp-1", null)
        );
        when(bookingProfessionalPlanGateway.allowsOnlinePayments(booking.getProfessionalId())).thenReturn(true);
        when(bookingFinanceService.ensureInitializedWithEvidence(booking))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.PAYMENT_PENDING));

        BookingPaymentSessionResponse response = service.createPaymentSessionForClient(
            String.valueOf(user.getId()),
            booking.getId(),
            null
        );

        assertEquals("tx-legacy-pending", response.getTransactionId());
        assertEquals("https://mp.test/checkout-rotated", response.getCheckoutUrl());
        assertEquals("MERCADOPAGO", response.getProvider());
        assertEquals(PaymentProvider.MERCADOPAGO, pendingCharge.getProvider());
        verify(providerClient).createBookingCheckout(any());
    }

    @Test
    void shouldCreateCheckoutDirectlyWithoutAfterCommit() throws Exception {
        BookingProviderIntegrationService service = buildService();
        User user = clientUser();
        Booking booking = prepaidBooking();
        PaymentTransaction createdCharge = new PaymentTransaction();
        createdCharge.setId("tx-new");
        createdCharge.setBooking(booking);
        createdCharge.setProfessionalId(booking.getProfessionalId());
        createdCharge.setProvider(PaymentProvider.MERCADOPAGO);
        createdCharge.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        createdCharge.setStatus(PaymentTransactionStatus.PENDING);
        createdCharge.setAmount(BigDecimal.valueOf(500));
        createdCharge.setCurrency("UYU");
        createdCharge.setExternalReference("booking:" + booking.getId());

        ProviderOperation operation = new ProviderOperation();
        operation.setId("op-new");
        operation.setOperationType(ProviderOperationType.BOOKING_CHECKOUT);
        operation.setStatus(ProviderOperationStatus.PENDING);
        operation.setProvider(PaymentProvider.MERCADOPAGO);
        operation.setBookingId(booking.getId());
        operation.setPaymentTransactionId(createdCharge.getId());
        operation.setExternalReference(createdCharge.getExternalReference());

        when(userRepository.findByIdAndDeletedAtIsNull(user.getId())).thenReturn(Optional.of(user));
        when(bookingRepository.findDetailedByIdForUpdate(booking.getId())).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(
                PaymentTransactionStatus.APPROVED,
                PaymentTransactionStatus.PARTIALLY_REFUNDED,
                PaymentTransactionStatus.REFUNDED
            )
        )).thenReturn(List.of());
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(PaymentTransactionStatus.PENDING)
        )).thenReturn(List.of());
        when(paymentTransactionRepository.saveAndFlush(any(PaymentTransaction.class))).thenReturn(createdCharge);
        when(providerOperationService.createOrReuseOperation(
            eq(ProviderOperationType.BOOKING_CHECKOUT),
            eq(PaymentProvider.MERCADOPAGO),
            eq(booking.getId()),
            eq(createdCharge.getId()),
            isNull(),
            isNull(),
            eq(createdCharge.getExternalReference()),
            any()
        )).thenReturn(operation);
        when(providerClient.createBookingCheckout(any())).thenReturn(
            new ProviderCheckoutSession("https://mp.test/checkout-new", "pref-new", null)
        );
        when(bookingProfessionalPlanGateway.allowsOnlinePayments(booking.getProfessionalId())).thenReturn(true);
        when(bookingFinanceService.ensureInitializedWithEvidence(booking))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.PAYMENT_PENDING));

        BookingPaymentSessionResponse response = service.createPaymentSessionForClient(
            String.valueOf(user.getId()),
            booking.getId(),
            null
        );

        assertEquals("tx-new", response.getTransactionId());
        assertEquals("https://mp.test/checkout-new", response.getCheckoutUrl());
        assertEquals("MERCADOPAGO", response.getProvider());
        verify(providerClient).createBookingCheckout(any());
        verify(providerOperationWorker, never()).processOperationNow(any());
        assertEquals(ProviderOperationStatus.SUCCEEDED, operation.getStatus());
    }

    @Test
    void shouldPreserveConcreteCheckoutFailureReason() {
        BookingProviderIntegrationService service = buildService();
        User user = clientUser();
        Booking booking = prepaidBooking();
        PaymentTransaction createdCharge = new PaymentTransaction();
        createdCharge.setId("tx-fail");
        createdCharge.setBooking(booking);
        createdCharge.setProfessionalId(booking.getProfessionalId());
        createdCharge.setProvider(PaymentProvider.MERCADOPAGO);
        createdCharge.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        createdCharge.setStatus(PaymentTransactionStatus.PENDING);
        createdCharge.setAmount(BigDecimal.valueOf(500));
        createdCharge.setCurrency("UYU");
        createdCharge.setExternalReference("booking:" + booking.getId());

        ProviderOperation operation = new ProviderOperation();
        operation.setId("op-fail");
        operation.setOperationType(ProviderOperationType.BOOKING_CHECKOUT);
        operation.setStatus(ProviderOperationStatus.PENDING);
        operation.setProvider(PaymentProvider.MERCADOPAGO);
        operation.setBookingId(booking.getId());
        operation.setPaymentTransactionId(createdCharge.getId());
        operation.setExternalReference(createdCharge.getExternalReference());

        when(userRepository.findByIdAndDeletedAtIsNull(user.getId())).thenReturn(Optional.of(user));
        when(bookingRepository.findDetailedByIdForUpdate(booking.getId())).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(
                PaymentTransactionStatus.APPROVED,
                PaymentTransactionStatus.PARTIALLY_REFUNDED,
                PaymentTransactionStatus.REFUNDED
            )
        )).thenReturn(List.of());
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(PaymentTransactionStatus.PENDING)
        )).thenReturn(List.of());
        when(paymentTransactionRepository.saveAndFlush(any(PaymentTransaction.class))).thenReturn(createdCharge);
        when(providerOperationService.createOrReuseOperation(
            eq(ProviderOperationType.BOOKING_CHECKOUT),
            eq(PaymentProvider.MERCADOPAGO),
            eq(booking.getId()),
            eq(createdCharge.getId()),
            isNull(),
            isNull(),
            eq(createdCharge.getExternalReference()),
            any()
        )).thenReturn(operation);
        when(providerClient.createBookingCheckout(any())).thenThrow(
            new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La conexion Mercado Pago del profesional no esta lista para cobrar reservas"
            )
        );
        when(bookingProfessionalPlanGateway.allowsOnlinePayments(booking.getProfessionalId())).thenReturn(true);
        when(bookingFinanceService.ensureInitializedWithEvidence(booking))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.PAYMENT_PENDING));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.createPaymentSessionForClient(String.valueOf(user.getId()), booking.getId(), null)
        );

        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatusCode());
        assertTrue(exception.getReason().contains("No se pudo iniciar checkout de reserva"));
    }

    @Test
    void shouldSyncPendingChargeUsingMercadoPagoVerificationByExternalReference() {
        BookingProviderIntegrationService service = buildService();
        Booking booking = prepaidBooking();
        PaymentTransaction charge = new PaymentTransaction();
        charge.setId("tx-verify");
        charge.setBooking(booking);
        charge.setProfessionalId(booking.getProfessionalId());
        charge.setProvider(PaymentProvider.MERCADOPAGO);
        charge.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        charge.setStatus(PaymentTransactionStatus.PENDING);
        charge.setAmount(BigDecimal.valueOf(500));
        charge.setCurrency("UYU");
        charge.setExternalReference("booking:" + booking.getId());
        charge.setPayloadJson("{\"checkoutUrl\":\"https://mp.test/checkout-verify\",\"providerCheckoutReference\":\"pref-verify\"}");

        when(bookingRepository.findDetailedById(booking.getId())).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(PaymentTransactionStatus.PENDING)
        )).thenReturn(List.of(charge));
        when(providerClient.verifyPayment(any())).thenReturn(new ProviderVerificationResult(
            true,
            "APPROVED",
            BigDecimal.valueOf(500),
            "UYU",
            booking.getProfessionalId(),
            null,
            "mp-pay-1",
            "debit_card",
            "visa"
        ));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingFinanceService.applyExternalPaymentEvidence(eq(booking), any(PaymentTransaction.class)))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.HELD));
        when(bookingRepository.save(any(Booking.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        boolean synced = service.syncPendingChargeStatus(booking.getId());

        assertTrue(synced);
        assertEquals(PaymentTransactionStatus.APPROVED, charge.getStatus());
        assertEquals(BookingOperationalStatus.CONFIRMED, booking.getOperationalStatus());
        assertEquals("mp-pay-1", charge.getProviderPaymentId());
    }

    @Test
    void shouldProcessReservationWebhookAndConfirmBooking() {
        BookingProviderIntegrationService service = buildService();
        Booking booking = prepaidBooking();
        PaymentTransaction charge = new PaymentTransaction();
        charge.setId("tx-webhook");
        charge.setBooking(booking);
        charge.setProfessionalId(booking.getProfessionalId());
        charge.setProvider(PaymentProvider.MERCADOPAGO);
        charge.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        charge.setStatus(PaymentTransactionStatus.PENDING);
        charge.setAmount(BigDecimal.valueOf(500));
        charge.setCurrency("UYU");
        charge.setExternalReference("booking:" + booking.getId());

        PaymentEvent paymentEvent = new PaymentEvent();
        ParsedWebhookEvent event = new ParsedWebhookEvent(
            PaymentProvider.MERCADOPAGO,
            WebhookEventDomain.RESERVATION,
            "evt-1",
            "mp-pay-1",
            WebhookEventType.PAYMENT_SUCCEEDED,
            booking.getProfessionalId(),
            booking.getId(),
            null,
            "mp-pay-1",
            "booking:" + booking.getId(),
            BigDecimal.valueOf(500),
            "UYU",
            null,
            false,
            LocalDateTime.of(2026, 3, 19, 12, 0),
            "hash",
            "{\"metadata\":{\"pluraDomain\":\"reservation\"}}"
        );

        when(paymentTransactionRepository.findByProviderAndProviderPaymentId(PaymentProvider.MERCADOPAGO, "mp-pay-1"))
            .thenReturn(Optional.of(charge));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingRepository.save(any(Booking.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingFinanceService.applyExternalPaymentEvidence(eq(booking), any(PaymentTransaction.class)))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.HELD));

        boolean processed = service.processWebhook(paymentEvent, event);

        assertTrue(processed);
        assertEquals(BookingOperationalStatus.CONFIRMED, booking.getOperationalStatus());
        verify(bookingEventService).record(
            eq(booking),
            eq(BookingEventType.BOOKING_CONFIRMED),
            eq(BookingActorType.SYSTEM),
            isNull(),
            any()
        );
    }

    @Test
    void shouldProcessMercadoPagoRefundWebhook() {
        BookingProviderIntegrationService service = buildService();
        Booking booking = prepaidBooking();
        BookingRefundRecord refundRecord = new BookingRefundRecord();
        refundRecord.setId("refund-1");
        refundRecord.setBooking(booking);
        refundRecord.setTargetAmount(BigDecimal.valueOf(250));
        refundRecord.setRequestedAmount(BigDecimal.valueOf(250));
        refundRecord.setCurrency("UYU");
        refundRecord.setReasonCode(BookingRefundReasonCode.CLIENT_CANCELLATION);
        refundRecord.setStatus(BookingRefundStatus.PENDING_PROVIDER);

        PaymentTransaction refundTx = new PaymentTransaction();
        refundTx.setId("tx-refund");
        refundTx.setBooking(booking);
        refundTx.setRefundRecord(refundRecord);
        refundTx.setProfessionalId(booking.getProfessionalId());
        refundTx.setProvider(PaymentProvider.MERCADOPAGO);
        refundTx.setTransactionType(PaymentTransactionType.BOOKING_REFUND);
        refundTx.setStatus(PaymentTransactionStatus.PENDING);
        refundTx.setExternalReference("refund:" + refundRecord.getId());

        PaymentEvent paymentEvent = new PaymentEvent();
        ParsedWebhookEvent event = new ParsedWebhookEvent(
            PaymentProvider.MERCADOPAGO,
            WebhookEventDomain.RESERVATION,
            "evt-refund",
            "rf-1",
            WebhookEventType.PAYMENT_REFUNDED,
            booking.getProfessionalId(),
            booking.getId(),
            null,
            "rf-1",
            "refund:" + refundRecord.getId(),
            BigDecimal.valueOf(250),
            "UYU",
            null,
            false,
            LocalDateTime.of(2026, 3, 19, 13, 0),
            "hash",
            "{\"metadata\":{\"pluraDomain\":\"reservation\"}}"
        );

        when(paymentTransactionRepository.findByProviderAndProviderPaymentId(PaymentProvider.MERCADOPAGO, "rf-1"))
            .thenReturn(Optional.of(refundTx));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentTransactionRepository.findTopByBooking_IdAndTransactionTypeOrderByCreatedAtDesc(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE
        )).thenReturn(Optional.empty());
        when(bookingFinanceService.findById(refundRecord.getId())).thenReturn(refundRecord);
        when(bookingFinanceService.markRefundRecordCompleted(refundRecord.getId(), "rf-1")).thenReturn(refundRecord);
        when(bookingFinanceService.applyExternalPaymentEvidence(eq(booking), any(PaymentTransaction.class)))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.REFUNDED));
        when(bookingFinanceService.applyRefundEvidence(booking, refundRecord))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.REFUNDED));

        boolean processed = service.processWebhook(paymentEvent, event);

        assertTrue(processed);
        assertEquals(PaymentTransactionStatus.APPROVED, refundTx.getStatus());
        verify(bookingFinanceService).markRefundRecordCompleted(refundRecord.getId(), "rf-1");
    }

    @Test
    void shouldKeepRefundOperationUnderFollowUpWhenProviderLeavesRefundPending() {
        BookingProviderIntegrationService service = buildService();
        Booking booking = prepaidBooking();

        BookingRefundRecord refundRecord = new BookingRefundRecord();
        refundRecord.setId("refund-pending");
        refundRecord.setBooking(booking);
        refundRecord.setTargetAmount(BigDecimal.valueOf(250));
        refundRecord.setRequestedAmount(BigDecimal.valueOf(250));
        refundRecord.setCurrency("UYU");
        refundRecord.setReasonCode(BookingRefundReasonCode.CLIENT_CANCELLATION);
        refundRecord.setStatus(BookingRefundStatus.PENDING_PROVIDER);

        PaymentTransaction refundTx = new PaymentTransaction();
        refundTx.setId("tx-refund-pending");
        refundTx.setBooking(booking);
        refundTx.setRefundRecord(refundRecord);
        refundTx.setProfessionalId(booking.getProfessionalId());
        refundTx.setProvider(PaymentProvider.MERCADOPAGO);
        refundTx.setTransactionType(PaymentTransactionType.BOOKING_REFUND);
        refundTx.setStatus(PaymentTransactionStatus.PENDING);
        refundTx.setExternalReference("refund:" + refundRecord.getId());

        PaymentTransaction chargeTx = new PaymentTransaction();
        chargeTx.setId("tx-charge-approved");
        chargeTx.setBooking(booking);
        chargeTx.setProfessionalId(booking.getProfessionalId());
        chargeTx.setProvider(PaymentProvider.MERCADOPAGO);
        chargeTx.setProviderPaymentId("pay-1");
        chargeTx.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        chargeTx.setStatus(PaymentTransactionStatus.APPROVED);
        chargeTx.setExternalReference("booking:" + booking.getId());
        chargeTx.setAmount(BigDecimal.valueOf(500));
        chargeTx.setCurrency("UYU");

        ProviderOperation operation = new ProviderOperation();
        operation.setId("op-refund-pending");
        operation.setOperationType(ProviderOperationType.BOOKING_REFUND);
        operation.setStatus(ProviderOperationStatus.PROCESSING);
        operation.setProvider(PaymentProvider.MERCADOPAGO);
        operation.setBookingId(booking.getId());
        operation.setPaymentTransactionId(refundTx.getId());
        operation.setRefundRecordId(refundRecord.getId());
        operation.setExternalReference(refundTx.getExternalReference());

        when(providerOperationService.getRequired(operation.getId())).thenReturn(operation);
        when(paymentTransactionRepository.findById(refundTx.getId())).thenReturn(Optional.of(refundTx));
        when(bookingRepository.findDetailedById(booking.getId())).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(
                PaymentTransactionStatus.APPROVED,
                PaymentTransactionStatus.PARTIALLY_REFUNDED,
                PaymentTransactionStatus.REFUNDED
            )
        )).thenReturn(List.of(chargeTx));
        when(bookingFinanceService.findById(refundRecord.getId())).thenReturn(refundRecord);
        when(providerClient.createRefund(any())).thenReturn(new com.plura.plurabackend.core.billing.payments.provider.ProviderRefundResult(
            "rf-pending",
            "pay-1",
            "PENDING",
            BigDecimal.valueOf(250),
            "UYU",
            "{\"status\":\"pending\"}"
        ));
        when(bookingFinanceService.markRefundRecordPendingProvider(refundRecord.getId(), "rf-pending")).thenReturn(refundRecord);
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingFinanceService.applyRefundEvidence(booking, refundRecord))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.REFUND_PENDING));

        service.processClaimedProviderOperation(operation.getId());

        ArgumentCaptor<com.plura.plurabackend.core.billing.payments.provider.ProviderRefundRequest> refundRequestCaptor =
            ArgumentCaptor.forClass(com.plura.plurabackend.core.billing.payments.provider.ProviderRefundRequest.class);
        verify(providerClient).createRefund(refundRequestCaptor.capture());
        assertEquals(booking.getProfessionalId(), refundRequestCaptor.getValue().professionalId());
        verify(providerOperationService).markUncertain(
            eq(operation.getId()),
            eq("rf-pending"),
            eq("{\"status\":\"pending\"}"),
            eq("awaiting_refund_webhook"),
            any(LocalDateTime.class)
        );
        verify(providerOperationService, never()).markSucceeded(eq(operation.getId()), eq("rf-pending"), eq("{\"status\":\"pending\"}"));
        assertEquals(PaymentTransactionStatus.PENDING, refundTx.getStatus());
        assertEquals("rf-pending", refundTx.getProviderPaymentId());
    }

    @Test
    void shouldNotifyRefundedWhenProviderCompletesRefundDuringDispatch() {
        BookingProviderIntegrationService service = buildService();
        Booking booking = prepaidBooking();

        BookingRefundRecord refundRecord = new BookingRefundRecord();
        refundRecord.setId("refund-success");
        refundRecord.setBooking(booking);
        refundRecord.setTargetAmount(BigDecimal.valueOf(250));
        refundRecord.setRequestedAmount(BigDecimal.valueOf(250));
        refundRecord.setCurrency("UYU");
        refundRecord.setReasonCode(BookingRefundReasonCode.CLIENT_CANCELLATION);
        refundRecord.setStatus(BookingRefundStatus.PENDING_PROVIDER);

        PaymentTransaction refundTx = new PaymentTransaction();
        refundTx.setId("tx-refund-success");
        refundTx.setBooking(booking);
        refundTx.setRefundRecord(refundRecord);
        refundTx.setProfessionalId(booking.getProfessionalId());
        refundTx.setProvider(PaymentProvider.MERCADOPAGO);
        refundTx.setTransactionType(PaymentTransactionType.BOOKING_REFUND);
        refundTx.setStatus(PaymentTransactionStatus.PENDING);
        refundTx.setExternalReference("refund:" + refundRecord.getId());

        PaymentTransaction chargeTx = new PaymentTransaction();
        chargeTx.setId("tx-charge-approved-success");
        chargeTx.setBooking(booking);
        chargeTx.setProfessionalId(booking.getProfessionalId());
        chargeTx.setProvider(PaymentProvider.MERCADOPAGO);
        chargeTx.setProviderPaymentId("pay-success");
        chargeTx.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        chargeTx.setStatus(PaymentTransactionStatus.APPROVED);
        chargeTx.setExternalReference("booking:" + booking.getId());
        chargeTx.setAmount(BigDecimal.valueOf(500));
        chargeTx.setCurrency("UYU");

        ProviderOperation operation = new ProviderOperation();
        operation.setId("op-refund-success");
        operation.setOperationType(ProviderOperationType.BOOKING_REFUND);
        operation.setStatus(ProviderOperationStatus.PROCESSING);
        operation.setProvider(PaymentProvider.MERCADOPAGO);
        operation.setBookingId(booking.getId());
        operation.setPaymentTransactionId(refundTx.getId());
        operation.setRefundRecordId(refundRecord.getId());
        operation.setExternalReference(refundTx.getExternalReference());

        when(providerOperationService.getRequired(operation.getId())).thenReturn(operation);
        when(paymentTransactionRepository.findById(refundTx.getId())).thenReturn(Optional.of(refundTx));
        when(bookingRepository.findDetailedById(booking.getId())).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(
                PaymentTransactionStatus.APPROVED,
                PaymentTransactionStatus.PARTIALLY_REFUNDED,
                PaymentTransactionStatus.REFUNDED
            )
        )).thenReturn(List.of(chargeTx));
        when(bookingFinanceService.findById(refundRecord.getId())).thenReturn(refundRecord);
        when(providerClient.createRefund(any())).thenReturn(new com.plura.plurabackend.core.billing.payments.provider.ProviderRefundResult(
            "rf-success",
            "pay-success",
            "APPROVED",
            BigDecimal.valueOf(250),
            "UYU",
            "{\"status\":\"approved\"}"
        ));
        when(bookingFinanceService.markRefundRecordCompleted(refundRecord.getId(), "rf-success")).thenReturn(refundRecord);
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingFinanceService.applyRefundEvidence(booking, refundRecord))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.REFUNDED));

        service.processClaimedProviderOperation(operation.getId());

        verify(providerOperationService).markSucceeded(operation.getId(), "rf-success", "{\"status\":\"approved\"}");
        verify(billingNotificationIntegrationService).recordPaymentRefunded(
            booking,
            refundTx,
            null,
            "refund_dispatch_succeeded"
        );
        assertEquals(PaymentTransactionStatus.APPROVED, refundTx.getStatus());
        assertEquals("rf-success", refundTx.getProviderPaymentId());
    }

    @Test
    void shouldFailLegacyProviderOperationWithoutCallingRuntimeProvider() {
        BookingProviderIntegrationService service = buildService();
        ProviderOperation operation = new ProviderOperation();
        operation.setId("op-legacy");
        operation.setOperationType(ProviderOperationType.BOOKING_REFUND);
        operation.setStatus(ProviderOperationStatus.PROCESSING);
        operation.setProvider(PaymentProvider.DLOCAL);

        when(providerOperationService.getRequired("op-legacy")).thenReturn(operation, operation);

        service.processClaimedProviderOperation("op-legacy");

        verify(providerOperationService).markFailed("op-legacy", null, null, "legacy_provider_retired");
        verify(providerClient, never()).createBookingCheckout(any());
    }

    private BookingProviderIntegrationService buildService() {
        billingProperties.setEnabled(true);
        billingProperties.getMercadopago().setEnabled(true);
        when(providerClient.provider()).thenReturn(PaymentProvider.MERCADOPAGO);
        return new BookingProviderIntegrationService(
            bookingRepository,
            professionalProfileRepository,
            professionalSideEffectCoordinator,
            userRepository,
            paymentTransactionRepository,
            bookingFinanceService,
            bookingEventService,
            bookingMoneyResolver,
            bookingPaymentBreakdownService,
            providerOperationService,
            providerOperationWorker,
            transactionManager,
            billingProperties,
            objectMapper,
            bookingProfessionalPlanGateway,
            billingNotificationIntegrationService,
            bookingNotificationIntegrationService,
            appProductEventTrackingService,
            List.of(providerClient)
        );
    }

    private User clientUser() {
        User user = new User();
        user.setId(1L);
        user.setRole(UserRole.USER);
        user.setEmail("cliente@test.com");
        user.setFullName("Cliente Test");
        return user;
    }

    private Booking prepaidBooking() {
        Booking booking = new Booking();
        booking.setId(10L);
        booking.setUser(clientUser());
        booking.setProfessionalId(30L);
        booking.setOperationalStatus(BookingOperationalStatus.PENDING);
        booking.setServiceNameSnapshot("Color");
        booking.setServicePaymentTypeSnapshot(ServicePaymentType.FULL_PREPAY);
        booking.setServicePriceSnapshot(BigDecimal.valueOf(500));
        booking.setServiceDepositAmountSnapshot(BigDecimal.ZERO);
        booking.setServiceCurrencySnapshot("UYU");
        booking.setTimezone("America/Montevideo");
        booking.setStartDateTime(LocalDateTime.now().plusDays(2));
        return booking;
    }

    private BookingFinancialSummary financialSummaryEntity(Booking booking, BookingFinancialStatus status) {
        BookingFinancialSummary summary = new BookingFinancialSummary();
        summary.setBooking(booking);
        summary.setFinancialStatus(status);
        summary.setCurrency("UYU");
        summary.setAmountCharged(BigDecimal.ZERO);
        summary.setAmountHeld(BigDecimal.ZERO);
        summary.setAmountToRefund(BigDecimal.ZERO);
        summary.setAmountRefunded(BigDecimal.ZERO);
        summary.setAmountToRelease(BigDecimal.ZERO);
        summary.setAmountReleased(BigDecimal.ZERO);
        return summary;
    }
}

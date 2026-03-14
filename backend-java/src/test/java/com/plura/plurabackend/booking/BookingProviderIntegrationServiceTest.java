package com.plura.plurabackend.booking;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.payments.model.PaymentEvent;
import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransactionStatus;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransactionType;
import com.plura.plurabackend.core.billing.payments.provider.PaymentProviderClient;
import com.plura.plurabackend.core.billing.payments.provider.ProviderCheckoutSession;
import com.plura.plurabackend.core.billing.payments.provider.ProviderVerificationResult;
import com.plura.plurabackend.core.billing.providerops.ProviderOperationService;
import com.plura.plurabackend.core.billing.providerops.ProviderOperationWorker;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperation;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationStatus;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationType;
import com.plura.plurabackend.core.billing.payments.repository.PaymentTransactionRepository;
import com.plura.plurabackend.core.billing.webhooks.ParsedWebhookEvent;
import com.plura.plurabackend.core.billing.webhooks.WebhookEventType;
import com.plura.plurabackend.core.booking.dto.BookingPaymentSessionResponse;
import com.plura.plurabackend.core.booking.event.BookingEventService;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.event.model.BookingEventType;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.finance.BookingMoneyResolver;
import com.plura.plurabackend.core.booking.finance.BookingProviderIntegrationService;
import com.plura.plurabackend.core.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.core.booking.finance.model.BookingFinancialStatus;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.professional.ProfessionalBillingSubjectGateway;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.mockito.ArgumentMatchers.isNull;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

class BookingProviderIntegrationServiceTest {

    private final BookingRepository bookingRepository = Mockito.mock(BookingRepository.class);
    private final UserRepository userRepository = Mockito.mock(UserRepository.class);
    private final PaymentTransactionRepository paymentTransactionRepository = Mockito.mock(PaymentTransactionRepository.class);
    private final BookingFinanceService bookingFinanceService = Mockito.mock(BookingFinanceService.class);
    private final BookingEventService bookingEventService = Mockito.mock(BookingEventService.class);
    private final ProviderOperationService providerOperationService = Mockito.mock(ProviderOperationService.class);
    private final ProviderOperationWorker providerOperationWorker = Mockito.mock(ProviderOperationWorker.class);
    private final BillingProperties billingProperties = Mockito.mock(BillingProperties.class);
    private final PaymentProviderClient providerClient = Mockito.mock(PaymentProviderClient.class);
    private final ProfessionalBillingSubjectGateway professionalBillingSubjectGateway =
        Mockito.mock(ProfessionalBillingSubjectGateway.class);
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
    private final Map<String, ProviderOperation> providerOperations = new HashMap<>();
    private final Map<Long, ProfessionalProfile> professionals = new HashMap<>();

    @Test
    void shouldReusePendingCheckoutSessionInsteadOfCreatingAnotherChargeAttempt() throws Exception {
        BookingProviderIntegrationService service = buildService();
        User user = clientUser();
        Booking booking = prepaidBooking();
        PaymentTransaction pendingCharge = new PaymentTransaction();
        pendingCharge.setId("tx-pending");
        pendingCharge.setBooking(booking);
        pendingCharge.setProfessionalId(booking.getProfessionalId());
        pendingCharge.setProvider(PaymentProvider.DLOCAL);
        pendingCharge.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        pendingCharge.setStatus(PaymentTransactionStatus.PENDING);
        pendingCharge.setAmount(BigDecimal.valueOf(500));
        pendingCharge.setCurrency("UYU");
        pendingCharge.setPayloadJson(objectMapper.writeValueAsString(
            new ProviderCheckoutSession("https://checkout.example/session-1", "pay-1", null)
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
        when(bookingFinanceService.ensureInitializedWithEvidence(booking))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.PAYMENT_PENDING));

        BookingPaymentSessionResponse response = service.createPaymentSessionForClient(
            String.valueOf(user.getId()),
            booking.getId(),
            null
        );

        assertEquals("tx-pending", response.getTransactionId());
        assertEquals("https://checkout.example/session-1", response.getCheckoutUrl());
        assertEquals("DLOCAL", response.getProvider());
        verify(paymentTransactionRepository, never()).saveAndFlush(any(PaymentTransaction.class));
        verify(providerClient, never()).createBookingCheckout(any());
    }

    @Test
    void shouldPreferLatestPendingChargeAttemptWhenMultiplePendingTransactionsExist() throws Exception {
        BookingProviderIntegrationService service = buildService();
        User user = clientUser();
        Booking booking = prepaidBooking();

        PaymentTransaction olderPending = new PaymentTransaction();
        olderPending.setId("tx-old");
        olderPending.setBooking(booking);
        olderPending.setProfessionalId(booking.getProfessionalId());
        olderPending.setProvider(PaymentProvider.DLOCAL);
        olderPending.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        olderPending.setStatus(PaymentTransactionStatus.PENDING);
        olderPending.setAmount(BigDecimal.valueOf(500));
        olderPending.setCurrency("UYU");
        olderPending.setCreatedAt(LocalDateTime.of(2026, 3, 9, 10, 0));
        olderPending.setPayloadJson(objectMapper.writeValueAsString(
            new ProviderCheckoutSession("https://checkout.example/old", "pay-old", null)
        ));

        PaymentTransaction latestPending = new PaymentTransaction();
        latestPending.setId("tx-new");
        latestPending.setBooking(booking);
        latestPending.setProfessionalId(booking.getProfessionalId());
        latestPending.setProvider(PaymentProvider.DLOCAL);
        latestPending.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        latestPending.setStatus(PaymentTransactionStatus.PENDING);
        latestPending.setAmount(BigDecimal.valueOf(500));
        latestPending.setCurrency("UYU");
        latestPending.setCreatedAt(LocalDateTime.of(2026, 3, 9, 11, 0));
        latestPending.setPayloadJson(objectMapper.writeValueAsString(
            new ProviderCheckoutSession("https://checkout.example/new", "pay-new", null)
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
        )).thenReturn(List.of(olderPending, latestPending));
        when(bookingFinanceService.ensureInitializedWithEvidence(booking))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.PAYMENT_PENDING));

        BookingPaymentSessionResponse response = service.createPaymentSessionForClient(
            String.valueOf(user.getId()),
            booking.getId(),
            null
        );

        assertEquals("tx-new", response.getTransactionId());
        assertEquals("https://checkout.example/new", response.getCheckoutUrl());
        verify(providerClient, never()).createBookingCheckout(any());
    }

    @Test
    void shouldAutoConfirmPendingPrepaidBookingWhenChargeWebhookSucceeds() {
        BookingProviderIntegrationService service = buildService();
        Booking booking = prepaidBooking();
        PaymentTransaction charge = new PaymentTransaction();
        charge.setId("tx-1");
        charge.setBooking(booking);
        charge.setProfessionalId(booking.getProfessionalId());
        charge.setProvider(PaymentProvider.DLOCAL);
        charge.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        charge.setStatus(PaymentTransactionStatus.PENDING);
        charge.setAmount(BigDecimal.valueOf(500));
        charge.setCurrency("UYU");
        charge.setProviderPaymentId("pay-1");

        PaymentEvent paymentEvent = new PaymentEvent();
        ParsedWebhookEvent event = new ParsedWebhookEvent(
            PaymentProvider.DLOCAL,
            "evt-1",
            "pay-1",
            WebhookEventType.PAYMENT_SUCCEEDED,
            booking.getProfessionalId(),
            booking.getId(),
            null,
            "pay-1",
            "booking:" + booking.getId(),
            BigDecimal.valueOf(500),
            "UYU",
            null,
            false,
            LocalDateTime.of(2026, 3, 9, 12, 0),
            "hash",
            "{}"
        );

        when(paymentTransactionRepository.findByProviderAndProviderPaymentId(PaymentProvider.DLOCAL, "pay-1"))
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
    void shouldResolveWebhookChargeByExternalReferenceBeforeCreatingBackfilledTransaction() {
        BookingProviderIntegrationService service = buildService();
        Booking booking = prepaidBooking();
        PaymentTransaction charge = new PaymentTransaction();
        charge.setId("tx-ext");
        charge.setBooking(booking);
        charge.setProfessionalId(booking.getProfessionalId());
        charge.setProvider(PaymentProvider.DLOCAL);
        charge.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        charge.setStatus(PaymentTransactionStatus.PENDING);
        charge.setAmount(BigDecimal.valueOf(500));
        charge.setCurrency("UYU");
        charge.setExternalReference("booking:" + booking.getId());

        PaymentEvent paymentEvent = new PaymentEvent();
        ParsedWebhookEvent event = new ParsedWebhookEvent(
            PaymentProvider.DLOCAL,
            "evt-ext",
            "pay-ext",
            WebhookEventType.PAYMENT_SUCCEEDED,
            booking.getProfessionalId(),
            booking.getId(),
            null,
            null,
            "booking:" + booking.getId(),
            BigDecimal.valueOf(500),
            "UYU",
            null,
            false,
            LocalDateTime.of(2026, 3, 9, 12, 30),
            "hash",
            "{}"
        );

        when(paymentTransactionRepository.findTopByExternalReferenceOrderByCreatedAtDesc("booking:" + booking.getId()))
            .thenReturn(Optional.of(charge));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingRepository.save(any(Booking.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingFinanceService.applyExternalPaymentEvidence(eq(booking), any(PaymentTransaction.class)))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.HELD));

        boolean processed = service.processWebhook(paymentEvent, event);

        assertTrue(processed);
        assertEquals("tx-ext", charge.getId());
        verify(paymentTransactionRepository).findTopByExternalReferenceOrderByCreatedAtDesc("booking:" + booking.getId());
        verify(paymentTransactionRepository, never()).findById("booking:" + booking.getId());
    }

    @Test
    void shouldSyncPendingChargeUsingProviderVerification() throws Exception {
        BookingProviderIntegrationService service = buildService();
        Booking booking = prepaidBooking();
        PaymentTransaction charge = new PaymentTransaction();
        charge.setId("tx-2");
        charge.setBooking(booking);
        charge.setProfessionalId(booking.getProfessionalId());
        charge.setProvider(PaymentProvider.DLOCAL);
        charge.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        charge.setStatus(PaymentTransactionStatus.PENDING);
        charge.setAmount(BigDecimal.valueOf(500));
        charge.setCurrency("UYU");
        charge.setProviderPaymentId("DP-1");
        charge.setExternalReference("booking:" + booking.getId());
        charge.setPayloadJson(objectMapper.writeValueAsString(
            new ProviderCheckoutSession("https://pay.dlocal.test/checkout-1", "DP-1", null)
        ));

        when(bookingRepository.findDetailedById(booking.getId())).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(PaymentTransactionStatus.PENDING)
        )).thenReturn(List.of(charge));
        when(providerClient.verifyPayment(any())).thenReturn(new ProviderVerificationResult(
            true,
            "PAID",
            BigDecimal.valueOf(500),
            "UYU",
            booking.getProfessionalId(),
            null,
            "DP-1"
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
        assertEquals(
            "https://pay.dlocal.test/checkout-1",
            objectMapper.readTree(charge.getPayloadJson()).path("checkoutUrl").asText()
        );
        verify(bookingRepository).findDetailedById(booking.getId());
        verify(bookingRepository, never()).findDetailedByIdForUpdate(booking.getId());
    }

    @Test
    void shouldRecreateCheckoutForPendingChargeWithoutStoredCheckoutUrl() {
        BookingProviderIntegrationService service = buildService();
        User user = clientUser();
        Booking booking = prepaidBooking();
        PaymentTransaction pendingCharge = new PaymentTransaction();
        pendingCharge.setId("tx-retry");
        pendingCharge.setBooking(booking);
        pendingCharge.setProfessionalId(booking.getProfessionalId());
        pendingCharge.setProvider(PaymentProvider.DLOCAL);
        pendingCharge.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        pendingCharge.setStatus(PaymentTransactionStatus.PENDING);
        pendingCharge.setAmount(BigDecimal.valueOf(500));
        pendingCharge.setCurrency("UYU");
        pendingCharge.setProviderPaymentId("DP-old");
        pendingCharge.setExternalReference("booking:" + booking.getId());
        pendingCharge.setPayloadJson("{\"source\":\"provider_verification\",\"status\":\"PENDING\"}");

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
            "DP-old"
        ));
        when(providerClient.createBookingCheckout(any())).thenReturn(
            new ProviderCheckoutSession("https://pay.dlocal.test/checkout-retry", "DP-new", null)
        );
        when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingFinanceService.ensureInitializedWithEvidence(booking))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.PAYMENT_PENDING));

        BookingPaymentSessionResponse response = service.createPaymentSessionForClient(
            String.valueOf(user.getId()),
            booking.getId(),
            null
        );

        assertEquals("https://pay.dlocal.test/checkout-retry", response.getCheckoutUrl());
        assertEquals("DP-new", pendingCharge.getProviderPaymentId());
        assertNotNull(pendingCharge.getPayloadJson());
        assertEquals("DP-old", readJsonField(pendingCharge.getPayloadJson(), "previousProviderPaymentId"));
        assertEquals("tx-retry", readJsonField(pendingCharge.getPayloadJson(), "transactionId"));
        assertEquals("booking:10", readJsonField(pendingCharge.getPayloadJson(), "externalReference"));
        verify(providerClient).createBookingCheckout(any());
    }

    @Test
    void shouldSendSplitCodeWhenCreatingBookingCheckout() {
        BookingProviderIntegrationService service = buildService();
        User user = clientUser();
        Booking booking = prepaidBooking();
        storedProfessional(booking).setDlocalSplitCode("seller-contract-001");
        java.util.concurrent.atomic.AtomicReference<PaymentTransaction> savedChargeRef = new java.util.concurrent.atomic.AtomicReference<>();

        when(userRepository.findByIdAndDeletedAtIsNull(user.getId())).thenReturn(Optional.of(user));
        when(bookingRepository.findDetailedByIdForUpdate(booking.getId())).thenReturn(Optional.of(booking));
        when(bookingRepository.findDetailedById(booking.getId())).thenReturn(Optional.of(booking));
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
        when(paymentTransactionRepository.saveAndFlush(any(PaymentTransaction.class)))
            .thenAnswer(invocation -> {
                PaymentTransaction transaction = invocation.getArgument(0);
                if (transaction.getId() == null) {
                    transaction.setId("tx-split");
                }
                savedChargeRef.set(transaction);
                return transaction;
            });
        when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
            .thenAnswer(invocation -> {
                PaymentTransaction transaction = invocation.getArgument(0);
                savedChargeRef.set(transaction);
                return transaction;
            });
        when(paymentTransactionRepository.findById("tx-split")).thenAnswer(invocation -> Optional.ofNullable(savedChargeRef.get()));
        when(providerClient.createBookingCheckout(any())).thenReturn(
            new ProviderCheckoutSession("https://pay.dlocal.test/checkout-split", "DP-split", null)
        );
        when(bookingFinanceService.ensureInitializedWithEvidence(booking))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.PAYMENT_PENDING));
        when(bookingFinanceService.applyExternalPaymentEvidence(eq(booking), any(PaymentTransaction.class)))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.HELD));

        BookingPaymentSessionResponse response = service.createPaymentSessionForClient(
            String.valueOf(user.getId()),
            booking.getId(),
            null
        );

        assertEquals("https://pay.dlocal.test/checkout-split", response.getCheckoutUrl());
        verify(providerClient).createBookingCheckout(argThat(request ->
            "seller-contract-001".equals(request.splitCode())
        ));
    }

    @Test
    void shouldSettlePayoutInternallyWhenChargeUsedSplitPayments() throws Exception {
        BookingProviderIntegrationService service = buildService();
        Booking booking = prepaidBooking();
        storedProfessional(booking).setDlocalSplitCode("seller-contract-001");

        var payoutRecord = new com.plura.plurabackend.core.booking.finance.model.BookingPayoutRecord();
        payoutRecord.setId("payout-1");
        payoutRecord.setBooking(booking);
        payoutRecord.setProfessionalId(booking.getProfessionalId());
        payoutRecord.setTargetAmount(BigDecimal.valueOf(500));
        payoutRecord.setReleasedAmount(BigDecimal.ZERO);
        payoutRecord.setCurrency("UYU");
        payoutRecord.setStatus(com.plura.plurabackend.core.booking.finance.model.BookingPayoutStatus.PENDING_MANUAL);

        PaymentTransaction charge = new PaymentTransaction();
        charge.setId("charge-1");
        charge.setBooking(booking);
        charge.setProfessionalId(booking.getProfessionalId());
        charge.setProvider(PaymentProvider.DLOCAL);
        charge.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        charge.setStatus(PaymentTransactionStatus.APPROVED);
        charge.setAmount(BigDecimal.valueOf(500));
        charge.setCurrency("UYU");
        charge.setProviderPaymentId("DP-split");
        charge.setPayloadJson(objectMapper.writeValueAsString(java.util.Map.of(
            "checkoutUrl", "https://pay.dlocal.test/checkout-split",
            "splitCode", "seller-contract-001",
            "splitPayment", true
        )));

        var completedRecord = new com.plura.plurabackend.core.booking.finance.model.BookingPayoutRecord();
        completedRecord.setId("payout-1");
        completedRecord.setBooking(booking);
        completedRecord.setProfessionalId(booking.getProfessionalId());
        completedRecord.setTargetAmount(BigDecimal.valueOf(500));
        completedRecord.setReleasedAmount(BigDecimal.valueOf(500));
        completedRecord.setCurrency("UYU");
        completedRecord.setStatus(com.plura.plurabackend.core.booking.finance.model.BookingPayoutStatus.COMPLETED);

        when(paymentTransactionRepository.findTopByPayoutRecord_IdOrderByCreatedAtDesc(payoutRecord.getId()))
            .thenReturn(Optional.empty());
        when(paymentTransactionRepository.findTopByBooking_IdAndTransactionTypeOrderByCreatedAtDesc(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE
        )).thenReturn(Optional.of(charge));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingFinanceService.markPayoutRecordCompleted(
            eq(payoutRecord.getId()),
            eq(PaymentProvider.DLOCAL),
            eq("split:charge-1"),
            eq(BigDecimal.valueOf(500)),
            any(),
            any()
        )).thenReturn(completedRecord);
        when(bookingFinanceService.applyPayoutEvidence(booking, completedRecord))
            .thenReturn(financialSummaryEntity(booking, BookingFinancialStatus.RELEASED));

        var result = service.processPostDecision(
            booking,
            new com.plura.plurabackend.core.booking.finance.BookingFinanceUpdateResult(
                financialSummaryEntity(booking, BookingFinancialStatus.RELEASE_PENDING),
                null,
                payoutRecord
            )
        );

        assertEquals(BookingFinancialStatus.RELEASED, result.localResult().summary().getFinancialStatus());
        verify(providerClient, never()).createPayout(any());
        verify(bookingFinanceService).markPayoutRecordCompleted(
            eq(payoutRecord.getId()),
            eq(PaymentProvider.DLOCAL),
            eq("split:charge-1"),
            eq(BigDecimal.valueOf(500)),
            any(),
            any()
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
        User professionalUser = new User();
        professionalUser.setId(20L);
        professionalUser.setFullName("Profesional Demo");
        ProfessionalProfile professional = new ProfessionalProfile();
        professional.setId(30L);
        professional.setUser(professionalUser);
        professional.setSlug("pro-demo");
        professional.setLocation("Montevideo");
        professional.setDlocalPayoutEnabled(true);
        professional.setDlocalBeneficiaryFirstName("Pro");
        professional.setDlocalBeneficiaryLastName("Demo");
        professional.setDlocalBeneficiaryDocumentType("CI");
        professional.setDlocalBeneficiaryDocumentNumber("1234567");
        professional.setDlocalBankCode("001");
        professional.setDlocalBankBranch("002");
        professional.setDlocalBankAccountNumber("123456789");
        professional.setDlocalBankAccountType("SAVINGS");
        professionals.put(professional.getId(), professional);

        Booking booking = new Booking();
        booking.setId(10L);
        booking.setUser(clientUser());
        booking.setProfessionalId(professional.getId());
        booking.setProfessionalSlugSnapshot(professional.getSlug());
        booking.setProfessionalDisplayNameSnapshot(professionalUser.getFullName());
        booking.setProfessionalLocationSnapshot(professional.getLocation());
        booking.setOperationalStatus(BookingOperationalStatus.PENDING);
        booking.setServiceId("svc-1");
        booking.setServiceNameSnapshot("Corte");
        booking.setServiceDurationSnapshot("60 min");
        booking.setServicePostBufferMinutesSnapshot(0);
        booking.setServicePaymentTypeSnapshot(ServicePaymentType.DEPOSIT);
        booking.setServiceDepositAmountSnapshot(BigDecimal.valueOf(500));
        booking.setServicePriceSnapshot(BigDecimal.valueOf(1500));
        booking.setServiceCurrencySnapshot("UYU");
        booking.setStartDateTime(LocalDateTime.of(2026, 3, 10, 15, 0));
        return booking;
    }

    private BookingFinancialSummary financialSummaryEntity(Booking booking, BookingFinancialStatus status) {
        BookingFinancialSummary summary = new BookingFinancialSummary();
        summary.setBooking(booking);
        summary.setCurrency("UYU");
        summary.setFinancialStatus(status);
        summary.setAmountCharged(BigDecimal.valueOf(500));
        summary.setAmountHeld(BigDecimal.valueOf(500));
        summary.setAmountToRefund(BigDecimal.ZERO);
        summary.setAmountRefunded(BigDecimal.ZERO);
        summary.setAmountToRelease(BigDecimal.ZERO);
        summary.setAmountReleased(BigDecimal.ZERO);
        return summary;
    }

    private BookingProviderIntegrationService buildService() {
        providerOperations.clear();
        professionals.clear();
        when(providerClient.provider()).thenReturn(PaymentProvider.DLOCAL);
        when(professionalBillingSubjectGateway.findById(any())).thenAnswer(invocation ->
            Optional.ofNullable(professionals.get(invocation.getArgument(0, Long.class)))
        );
        when(providerOperationService.getRequired(any())).thenAnswer(invocation -> {
            String operationId = invocation.getArgument(0, String.class);
            ProviderOperation operation = providerOperations.get(operationId);
            if (operation == null) {
                throw new IllegalStateException("Provider operation no encontrada");
            }
            return operation;
        });
        when(providerOperationService.markSucceeded(any(), any(), any())).thenAnswer(invocation -> {
            String operationId = invocation.getArgument(0, String.class);
            ProviderOperation operation = providerOperations.getOrDefault(operationId, new ProviderOperation());
            operation.setId(operationId);
            operation.setStatus(ProviderOperationStatus.SUCCEEDED);
            operation.setProviderReference(invocation.getArgument(1, String.class));
            operation.setResponsePayloadJson(invocation.getArgument(2, String.class));
            providerOperations.put(operationId, operation);
            return operation;
        });
        when(providerOperationService.markRetryable(any(), any(), any(), any(), any())).thenAnswer(invocation -> {
            String operationId = invocation.getArgument(0, String.class);
            ProviderOperation operation = providerOperations.getOrDefault(operationId, new ProviderOperation());
            operation.setId(operationId);
            operation.setStatus(ProviderOperationStatus.RETRYABLE);
            operation.setProviderReference(invocation.getArgument(1, String.class));
            operation.setResponsePayloadJson(invocation.getArgument(2, String.class));
            providerOperations.put(operationId, operation);
            return operation;
        });
        when(providerOperationService.markFailed(any(), any(), any(), any())).thenAnswer(invocation -> {
            String operationId = invocation.getArgument(0, String.class);
            ProviderOperation operation = providerOperations.getOrDefault(operationId, new ProviderOperation());
            operation.setId(operationId);
            operation.setStatus(ProviderOperationStatus.FAILED);
            operation.setProviderReference(invocation.getArgument(1, String.class));
            operation.setResponsePayloadJson(invocation.getArgument(2, String.class));
            providerOperations.put(operationId, operation);
            return operation;
        });
        when(providerOperationService.markUncertain(any(), any(), any(), any(), any())).thenAnswer(invocation -> {
            String operationId = invocation.getArgument(0, String.class);
            ProviderOperation operation = providerOperations.getOrDefault(operationId, new ProviderOperation());
            operation.setId(operationId);
            operation.setStatus(ProviderOperationStatus.UNCERTAIN);
            operation.setProviderReference(invocation.getArgument(1, String.class));
            operation.setResponsePayloadJson(invocation.getArgument(2, String.class));
            providerOperations.put(operationId, operation);
            return operation;
        });
        when(providerOperationService.createOrReuseOperation(any(), any(), any(), any(), any(), any(), any(), any()))
            .thenAnswer(invocation -> {
                ProviderOperation operation = new ProviderOperation();
                operation.setId("op-" + invocation.getArgument(6, String.class));
                operation.setOperationType(invocation.getArgument(0, ProviderOperationType.class));
                operation.setProvider(invocation.getArgument(1, PaymentProvider.class));
                operation.setBookingId(invocation.getArgument(2, Long.class));
                operation.setPaymentTransactionId(invocation.getArgument(3, String.class));
                operation.setRefundRecordId(invocation.getArgument(4, String.class));
                operation.setPayoutRecordId(invocation.getArgument(5, String.class));
                operation.setExternalReference(invocation.getArgument(6, String.class));
                operation.setStatus(ProviderOperationStatus.PENDING);
                operation.setAttemptCount(0);
                providerOperations.put(operation.getId(), operation);
                return operation;
            });
        when(providerOperationService.claimOperation(any(), any(), any())).thenAnswer(invocation -> {
            String operationId = invocation.getArgument(0, String.class);
            ProviderOperation operation = providerOperations.get(operationId);
            if (operation == null) {
                operation = new ProviderOperation();
                operation.setId(operationId);
            }
            operation.setStatus(ProviderOperationStatus.PROCESSING);
            operation.setAttemptCount(operation.getAttemptCount() == null ? 1 : operation.getAttemptCount() + 1);
            providerOperations.put(operationId, operation);
            return operation;
        });
        BookingProviderIntegrationService service = new BookingProviderIntegrationService(
            bookingRepository,
            userRepository,
            paymentTransactionRepository,
            bookingFinanceService,
            bookingEventService,
            new BookingMoneyResolver(),
            providerOperationService,
            providerOperationWorker,
            transactionManager,
            billingProperties,
            objectMapper,
            professionalId -> true,
            professionalBillingSubjectGateway,
            List.of(providerClient)
        );
        when(providerOperationWorker.kickOperationAsync(any())).thenAnswer(invocation -> {
            String operationId = invocation.getArgument(0, String.class);
            providerOperationService.claimOperation(operationId, "test-worker", LocalDateTime.now().plusMinutes(2));
            service.processClaimedProviderOperation(operationId);
            return CompletableFuture.completedFuture(true);
        });
        when(providerOperationWorker.awaitOperationState(any(), any())).thenAnswer(invocation ->
            providerOperationService.getRequired(invocation.getArgument(0, String.class))
        );
        Mockito.doAnswer(invocation -> {
            List<String> operationIds = invocation.getArgument(0);
            if (operationIds != null) {
                for (String operationId : operationIds) {
                    providerOperationService.claimOperation(operationId, "test-worker", LocalDateTime.now().plusMinutes(2));
                    service.processClaimedProviderOperation(operationId);
                }
            }
            return null;
        }).when(providerOperationWorker).kickOperationsAsync(any());
        return service;
    }

    private ProfessionalProfile storedProfessional(Booking booking) {
        return professionals.get(booking.getProfessionalId());
    }

    private String readJsonField(String json, String field) {
        try {
            return objectMapper.readTree(json).path(field).asText(null);
        } catch (Exception exception) {
            throw new AssertionError("No se pudo leer payload json", exception);
        }
    }
}

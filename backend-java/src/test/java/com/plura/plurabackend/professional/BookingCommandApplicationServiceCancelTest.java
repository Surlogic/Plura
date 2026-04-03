package com.plura.plurabackend.professional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.billing.providerops.ProviderOperationWorker;
import com.plura.plurabackend.core.booking.BookingCommandResponseAssembler;
import com.plura.plurabackend.core.booking.BookingCommandStateSupport;
import com.plura.plurabackend.core.booking.BookingFinancialCommandSupport;
import com.plura.plurabackend.core.booking.BookingPaymentsGateway;
import com.plura.plurabackend.core.booking.BookingSchedulingAvailabilityGateway;
import com.plura.plurabackend.core.booking.actions.BookingActionsEvaluation;
import com.plura.plurabackend.core.booking.actions.BookingActionsEvaluator;
import com.plura.plurabackend.core.booking.actions.model.BookingSuggestedAction;
import com.plura.plurabackend.core.booking.decision.BookingActionDecisionService;
import com.plura.plurabackend.core.booking.decision.model.BookingActionDecision;
import com.plura.plurabackend.core.booking.decision.model.BookingActionType;
import com.plura.plurabackend.core.booking.dto.BookingActionDecisionResponse;
import com.plura.plurabackend.core.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.core.booking.dto.BookingFinancialSummaryResponse;
import com.plura.plurabackend.core.booking.dto.BookingRefundRecordResponse;
import com.plura.plurabackend.core.booking.event.BookingEventService;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.finance.BookingFinanceDispatchPlan;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.finance.BookingFinanceUpdateResult;
import com.plura.plurabackend.core.booking.finance.model.BookingFinancialStatus;
import com.plura.plurabackend.core.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.core.booking.finance.model.BookingRefundReasonCode;
import com.plura.plurabackend.core.booking.finance.model.BookingRefundRecord;
import com.plura.plurabackend.core.booking.finance.model.BookingRefundStatus;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshot;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.core.booking.policy.ResolvedBookingPolicy;
import com.plura.plurabackend.core.booking.policy.model.LateCancellationRefundMode;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import com.plura.plurabackend.core.notification.integration.booking.BookingNotificationIntegrationService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.application.ProfessionalSideEffectCoordinator;
import com.plura.plurabackend.professional.booking.application.BookingCommandApplicationService;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import io.micrometer.core.instrument.MeterRegistry;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class BookingCommandApplicationServiceCancelTest {

    private final ProfessionalProfileRepository professionalProfileRepository = mock(ProfessionalProfileRepository.class);
    private final ProfesionalServiceRepository profesionalServiceRepository = mock(ProfesionalServiceRepository.class);
    private final BookingRepository bookingRepository = mock(BookingRepository.class);
    private final BookingPolicySnapshotService bookingPolicySnapshotService = mock(BookingPolicySnapshotService.class);
    private final BookingActionsEvaluator bookingActionsEvaluator = mock(BookingActionsEvaluator.class);
    private final BookingActionDecisionService bookingActionDecisionService = mock(BookingActionDecisionService.class);
    private final BookingFinanceService bookingFinanceService = mock(BookingFinanceService.class);
    private final BookingPaymentsGateway bookingPaymentsGateway = mock(BookingPaymentsGateway.class);
    private final BookingSchedulingAvailabilityGateway bookingSchedulingAvailabilityGateway = mock(
        BookingSchedulingAvailabilityGateway.class
    );
    private final BookingEventService bookingEventService = mock(BookingEventService.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final BookingDateTimeService bookingDateTimeService = new BookingDateTimeService("America/Montevideo");
    private final ProfessionalAccessSupport professionalAccessSupport = new ProfessionalAccessSupport(
        professionalProfileRepository,
        userRepository
    );
    private final ProfessionalSideEffectCoordinator sideEffectCoordinator = mock(ProfessionalSideEffectCoordinator.class);
    private final ProviderOperationWorker providerOperationWorker = mock(ProviderOperationWorker.class);
    private final BookingCommandStateSupport bookingCommandStateSupport = new BookingCommandStateSupport(
        bookingDateTimeService
    );
    private final BookingFinancialCommandSupport bookingFinancialCommandSupport = new BookingFinancialCommandSupport(
        bookingFinanceService,
        bookingPaymentsGateway,
        providerOperationWorker
    );
    private final BookingCommandResponseAssembler bookingCommandResponseAssembler = new BookingCommandResponseAssembler(
        bookingFinanceService,
        bookingPolicySnapshotService,
        bookingActionDecisionService,
        bookingDateTimeService
    );
    private final BookingNotificationIntegrationService bookingNotificationIntegrationService =
        mock(BookingNotificationIntegrationService.class);
    private final MeterRegistry meterRegistry = mock(MeterRegistry.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final BookingCommandApplicationService bookingCommandApplicationService = new BookingCommandApplicationService(
        professionalProfileRepository,
        profesionalServiceRepository,
        bookingRepository,
        bookingPolicySnapshotService,
        bookingActionsEvaluator,
        bookingActionDecisionService,
        bookingFinanceService,
        bookingSchedulingAvailabilityGateway,
        bookingEventService,
        userRepository,
        bookingDateTimeService,
        professionalAccessSupport,
        sideEffectCoordinator,
        bookingFinancialCommandSupport,
        bookingCommandResponseAssembler,
        bookingCommandStateSupport,
        bookingNotificationIntegrationService,
        meterRegistry,
        passwordEncoder,
        "America/Montevideo"
    );

    @Test
    void shouldCancelClientBookingAndTriggerRefundWhenCancellationIsEligible() {
        User client = new User();
        client.setId(10L);
        client.setRole(UserRole.USER);
        client.setFullName("Cliente");

        User professionalUser = new User();
        professionalUser.setId(20L);
        professionalUser.setRole(UserRole.PROFESSIONAL);

        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(30L);
        profile.setUser(professionalUser);
        profile.setActive(true);

        Booking booking = new Booking();
        booking.setId(40L);
        booking.setUser(client);
        booking.setProfessionalId(profile.getId());
        booking.setOperationalStatus(BookingOperationalStatus.CONFIRMED);
        booking.setTimezone("America/Montevideo");
        booking.setStartDateTime(LocalDateTime.now().plusDays(2));
        booking.setServiceNameSnapshot("Corte");
        booking.setServiceDurationSnapshot("60 min");
        booking.setServicePostBufferMinutesSnapshot(0);
        booking.setServicePaymentTypeSnapshot(ServicePaymentType.FULL_PREPAY);
        booking.setServicePriceSnapshot(BigDecimal.valueOf(500));
        booking.setServiceDepositAmountSnapshot(BigDecimal.ZERO);
        booking.setServiceCurrencySnapshot("UYU");

        BookingPolicySnapshot policy = new BookingPolicySnapshot(
            "policy-1",
            1L,
            profile.getId(),
            LocalDateTime.now(),
            true,
            true,
            24,
            2,
            1,
            LateCancellationRefundMode.FULL,
            BigDecimal.valueOf(100)
        );
        BookingActionsEvaluation evaluation = new BookingActionsEvaluation(
            true,
            true,
            false,
            false,
            BigDecimal.valueOf(500),
            BigDecimal.ZERO,
            "UYU",
            BookingSuggestedAction.NONE,
            List.of(),
            "booking.actions.free_cancellation_available",
            Map.of(),
            "La reserva puede cancelarse sin penalidad."
        );

        BookingActionDecision decision = new BookingActionDecision();
        decision.setId("decision-cancel");
        decision.setBooking(booking);
        decision.setActionType(BookingActionType.CANCEL);
        decision.setActorType(BookingActorType.CLIENT);
        decision.setActorUserId(client.getId());

        BookingActionDecisionResponse decisionResponse = new BookingActionDecisionResponse(
            decision.getId(),
            "CANCEL",
            "CLIENT",
            "CONFIRMED",
            "CANCELLED",
            BigDecimal.valueOf(500),
            BigDecimal.ZERO,
            "UYU",
            "PENDING_REFUND_REVIEW",
            List.of(),
            "booking.actions.free_cancellation_available",
            Map.of(),
            "La reserva puede cancelarse sin penalidad.",
            LocalDateTime.now()
        );

        BookingFinancialSummary summary = new BookingFinancialSummary();
        summary.setBooking(booking);
        summary.setCurrency("UYU");
        summary.setFinancialStatus(BookingFinancialStatus.REFUND_PENDING);
        summary.setAmountCharged(BigDecimal.valueOf(500));
        summary.setAmountHeld(BigDecimal.valueOf(500));
        summary.setAmountToRefund(BigDecimal.valueOf(500));
        summary.setAmountRefunded(BigDecimal.ZERO);
        summary.setAmountToRelease(BigDecimal.ZERO);
        summary.setAmountReleased(BigDecimal.ZERO);

        BookingRefundRecord refundRecord = new BookingRefundRecord();
        refundRecord.setId("refund-1");
        refundRecord.setBooking(booking);
        refundRecord.setActorType(BookingActorType.CLIENT);
        refundRecord.setActorUserId(client.getId());
        refundRecord.setRequestedAmount(BigDecimal.valueOf(500));
        refundRecord.setTargetAmount(BigDecimal.valueOf(500));
        refundRecord.setStatus(BookingRefundStatus.PENDING_PROVIDER);
        refundRecord.setReasonCode(BookingRefundReasonCode.CLIENT_CANCELLATION);
        refundRecord.setCurrency("UYU");
        refundRecord.setRelatedDecisionId(decision.getId());

        BookingFinanceUpdateResult financeResult = new BookingFinanceUpdateResult(summary, refundRecord, null);

        when(userRepository.findByIdAndDeletedAtIsNull(client.getId())).thenReturn(Optional.of(client));
        when(bookingRepository.findDetailedByIdForUpdate(booking.getId())).thenReturn(Optional.of(booking));
        when(professionalProfileRepository.findByIdForUpdate(profile.getId())).thenReturn(Optional.of(profile));
        when(bookingPolicySnapshotService.resolveForBooking(booking)).thenReturn(
            new ResolvedBookingPolicy(policy, ResolvedBookingPolicy.PolicySnapshotSource.SNAPSHOT)
        );
        when(bookingActionsEvaluator.evaluate(any(), any(), any(), any())).thenReturn(evaluation);
        when(bookingRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingActionDecisionService.record(any(), any(), any(), anyLong(), any(), any(), any(), any()))
            .thenReturn(decision);
        when(bookingActionDecisionService.toResponse(decision)).thenReturn(decisionResponse);
        when(bookingFinanceService.applyDecision(any(), any())).thenReturn(financeResult);
        when(bookingPaymentsGateway.processPostDecision(any(), any()))
            .thenReturn(new BookingFinanceDispatchPlan(financeResult, List.of("op-refund-1")));
        when(bookingFinanceService.toResponse(summary)).thenReturn(new BookingFinancialSummaryResponse(
            summary.getAmountCharged(),
            summary.getAmountHeld(),
            summary.getAmountToRefund(),
            summary.getAmountRefunded(),
            summary.getAmountToRelease(),
            summary.getAmountReleased(),
            summary.getCurrency(),
            summary.getFinancialStatus().name(),
            decision.getId(),
            LocalDateTime.now()
        ));
        when(bookingFinanceService.toResponse(refundRecord)).thenReturn(new BookingRefundRecordResponse(
            refundRecord.getId(),
            refundRecord.getActorType().name(),
            refundRecord.getActorUserId(),
            refundRecord.getRequestedAmount(),
            refundRecord.getTargetAmount(),
            refundRecord.getStatus().name(),
            refundRecord.getReasonCode().name(),
            refundRecord.getCurrency(),
            refundRecord.getProviderReference(),
            refundRecord.getRelatedDecisionId(),
            LocalDateTime.now(),
            LocalDateTime.now()
        ));

        BookingCommandResponse response = bookingCommandApplicationService.cancelBookingAsClient(
            String.valueOf(client.getId()),
            booking.getId(),
            null
        );

        assertEquals(BookingOperationalStatus.CANCELLED, booking.getOperationalStatus());
        assertNotNull(response.getRefundRecord());
        assertEquals("PENDING_PROVIDER", response.getRefundRecord().getStatus());
        assertEquals(BigDecimal.valueOf(500), response.getRefundRecord().getTargetAmount());
        verify(providerOperationWorker).kickOperationsAsync(List.of("op-refund-1"));
    }
}

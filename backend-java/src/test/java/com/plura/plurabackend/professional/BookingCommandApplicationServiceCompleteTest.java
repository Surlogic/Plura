package com.plura.plurabackend.professional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.booking.actions.BookingActionsEvaluator;
import com.plura.plurabackend.core.booking.BookingCommandResponseAssembler;
import com.plura.plurabackend.core.booking.BookingCommandStateSupport;
import com.plura.plurabackend.core.booking.BookingFinancialCommandSupport;
import com.plura.plurabackend.core.booking.BookingPaymentsGateway;
import com.plura.plurabackend.core.booking.BookingSchedulingAvailabilityGateway;
import com.plura.plurabackend.core.booking.decision.BookingActionDecisionService;
import com.plura.plurabackend.core.booking.event.BookingEventService;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import com.plura.plurabackend.core.billing.providerops.ProviderOperationWorker;
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
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

class BookingCommandApplicationServiceCompleteTest {

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
    void rejectsCompleteBeforeBookingEnds() {
        User professionalUser = new User();
        professionalUser.setId(20L);
        professionalUser.setRole(UserRole.PROFESSIONAL);
        professionalUser.setFullName("Profesional");

        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(30L);
        profile.setUser(professionalUser);
        profile.setActive(true);

        User clientUser = new User();
        clientUser.setId(10L);
        clientUser.setRole(UserRole.USER);

        Booking booking = new Booking();
        booking.setId(40L);
        booking.setUser(clientUser);
        booking.setProfessionalId(profile.getId());
        booking.setOperationalStatus(BookingOperationalStatus.CONFIRMED);
        booking.setTimezone("America/Montevideo");
        booking.setStartDateTime(LocalDateTime.now().minusMinutes(30));
        booking.setServiceDurationSnapshot("60 min");
        booking.setServicePostBufferMinutesSnapshot(0);
        booking.setServicePaymentTypeSnapshot(ServicePaymentType.ON_SITE);
        booking.setServicePriceSnapshot(BigDecimal.ZERO);

        when(professionalProfileRepository.findByUser_Id(professionalUser.getId())).thenReturn(Optional.of(profile));
        when(bookingRepository.findDetailedByIdForUpdate(booking.getId())).thenReturn(Optional.of(booking));

        ResponseStatusException ex = assertThrows(
            ResponseStatusException.class,
            () -> bookingCommandApplicationService.completeBooking(String.valueOf(professionalUser.getId()), booking.getId())
        );

        assertEquals(409, ex.getStatusCode().value());
    }
}

package com.plura.plurabackend.booking.application;

import com.plura.plurabackend.booking.decision.BookingActionDecisionService;
import com.plura.plurabackend.booking.decision.model.BookingActionDecision;
import com.plura.plurabackend.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.finance.BookingFinanceService;
import com.plura.plurabackend.booking.finance.BookingFinanceUpdateResult;
import com.plura.plurabackend.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.ServicePaymentType;
import com.plura.plurabackend.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.booking.time.BookingDateTimeService;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class BookingCommandResponseAssembler {

    private final BookingFinanceService bookingFinanceService;
    private final BookingPolicySnapshotService bookingPolicySnapshotService;
    private final BookingActionDecisionService bookingActionDecisionService;
    private final BookingDateTimeService bookingDateTimeService;

    public BookingCommandResponseAssembler(
        BookingFinanceService bookingFinanceService,
        BookingPolicySnapshotService bookingPolicySnapshotService,
        BookingActionDecisionService bookingActionDecisionService,
        BookingDateTimeService bookingDateTimeService
    ) {
        this.bookingFinanceService = bookingFinanceService;
        this.bookingPolicySnapshotService = bookingPolicySnapshotService;
        this.bookingActionDecisionService = bookingActionDecisionService;
        this.bookingDateTimeService = bookingDateTimeService;
    }

    public BookingCommandResponse toCommandResponse(
        Booking booking,
        BookingActionDecision decision,
        BookingFinanceUpdateResult financeResult
    ) {
        var decisionResponse = bookingActionDecisionService.toResponse(decision);
        return new BookingCommandResponse(
            toProfessionalBookingResponse(booking, financeResult),
            decisionResponse,
            booking.getOperationalStatus().name(),
            financeResult == null ? null : bookingFinanceService.toResponse(financeResult.summary()),
            financeResult == null ? null : bookingFinanceService.toResponse(financeResult.refundRecord()),
            financeResult == null ? null : bookingFinanceService.toResponse(financeResult.payoutRecord()),
            decisionResponse == null ? null : decisionResponse.getMessageCode(),
            decisionResponse == null ? Map.of() : decisionResponse.getMessageParams(),
            decisionResponse == null ? null : decisionResponse.getPlainTextFallback()
        );
    }

    public BookingCommandResponse toRetryPayoutAlreadyCompleted(Booking booking, BookingPayoutRecord payoutRecord) {
        BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
        return new BookingCommandResponse(
            toProfessionalBookingResponse(booking),
            null,
            booking.getOperationalStatus().name(),
            bookingFinanceService.toResponse(summary),
            null,
            bookingFinanceService.toResponse(payoutRecord),
            "booking.payout.already_completed",
            Map.of("bookingId", String.valueOf(booking.getId())),
            "El payout ya fue completado."
        );
    }

    public BookingCommandResponse toRetryPayoutProcessed(Booking booking, BookingFinanceUpdateResult financeResult) {
        return new BookingCommandResponse(
            toProfessionalBookingResponse(booking, financeResult),
            null,
            booking.getOperationalStatus().name(),
            financeResult == null ? null : bookingFinanceService.toResponse(financeResult.summary()),
            financeResult == null ? null : bookingFinanceService.toResponse(financeResult.refundRecord()),
            financeResult == null ? null : bookingFinanceService.toResponse(financeResult.payoutRecord()),
            "booking.payout.retry_processed",
            Map.of("bookingId", String.valueOf(booking.getId())),
            "El retry de payout fue procesado."
        );
    }

    public void refreshCommandResponse(
        BookingCommandResponse response,
        Booking booking,
        BookingFinanceUpdateResult financeResult
    ) {
        if (response == null) {
            return;
        }
        response.setBooking(toProfessionalBookingResponse(booking, financeResult));
        response.setOperationalStatus(booking.getOperationalStatus().name());
        response.setFinancialSummary(financeResult == null ? null : bookingFinanceService.toResponse(financeResult.summary()));
        response.setRefundRecord(financeResult == null ? null : bookingFinanceService.toResponse(financeResult.refundRecord()));
        response.setPayoutRecord(financeResult == null ? null : bookingFinanceService.toResponse(financeResult.payoutRecord()));
    }

    public ProfessionalBookingResponse toProfessionalBookingResponse(Booking booking) {
        return toProfessionalBookingResponse(booking, null);
    }

    private ProfessionalBookingResponse toProfessionalBookingResponse(
        Booking booking,
        BookingFinanceUpdateResult financeResult
    ) {
        int postBufferMinutes = booking.getServicePostBufferMinutesSnapshot() == null
            ? resolvePostBufferMinutes(booking)
            : booking.getServicePostBufferMinutesSnapshot();
        String duration = booking.getServiceDurationSnapshot() == null
            ? booking.getService().getDuration()
            : booking.getServiceDurationSnapshot();
        String serviceName = booking.getServiceNameSnapshot() == null
            ? booking.getService().getName()
            : booking.getServiceNameSnapshot();
        BookingFinancialSummary summary = financeResult != null && financeResult.summary() != null
            ? financeResult.summary()
            : bookingFinanceService.ensureInitializedWithEvidence(booking);
        var latestRefund = financeResult != null && financeResult.refundRecord() != null
            ? financeResult.refundRecord()
            : bookingFinanceService.findLatestRefundRecord(booking.getId());
        var latestPayout = financeResult != null && financeResult.payoutRecord() != null
            ? financeResult.payoutRecord()
            : bookingFinanceService.findLatestPayoutRecord(booking.getId());
        ProfessionalBookingResponse response = new ProfessionalBookingResponse(
            booking.getId(),
            String.valueOf(booking.getUser().getId()),
            booking.getUser().getFullName(),
            booking.getService().getId(),
            serviceName,
            booking.getStartDateTime().toString(),
            bookingDateTimeService.toUtcString(booking),
            booking.getTimezone(),
            duration,
            postBufferMinutes,
            parseDurationToMinutes(duration) + postBufferMinutes,
            resolveServicePaymentType(booking.getServicePaymentTypeSnapshot()).name(),
            booking.getRescheduleCount(),
            booking.getOperationalStatus().name(),
            summary.getFinancialStatus() == null ? null : summary.getFinancialStatus().name(),
            bookingFinanceService.resolveRefundStatus(latestRefund),
            bookingFinanceService.resolvePayoutStatus(latestPayout),
            bookingFinanceService.toResponse(summary)
        );
        response.setLatestRefund(bookingFinanceService.toResponse(latestRefund));
        response.setLatestPayout(bookingFinanceService.toResponse(latestPayout));
        response.setPolicySnapshot(bookingPolicySnapshotService.toResponse(bookingPolicySnapshotService.resolveForBooking(booking)));
        return response;
    }

    private int resolvePostBufferMinutes(Booking booking) {
        if (booking.getService() == null
            || booking.getService().getPostBufferMinutes() == null
            || booking.getService().getPostBufferMinutes() < 0) {
            return 0;
        }
        return booking.getService().getPostBufferMinutes();
    }

    private ServicePaymentType resolveServicePaymentType(ServicePaymentType paymentType) {
        return paymentType == null ? ServicePaymentType.ON_SITE : paymentType;
    }

    private int parseDurationToMinutes(String duration) {
        if (duration == null || duration.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duración del servicio inválida");
        }
        String normalized = duration.trim().toLowerCase();
        if (normalized.matches("^\\d+$")) {
            int minutes = Integer.parseInt(normalized);
            if (minutes <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duración del servicio inválida");
            }
            return minutes;
        }

        Matcher matcher = Pattern.compile("\\d+").matcher(normalized);
        List<Integer> numbers = new ArrayList<>();
        while (matcher.find()) {
            numbers.add(Integer.parseInt(matcher.group()));
        }
        if (numbers.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duración del servicio inválida");
        }

        int minutes;
        if (normalized.contains("h")) {
            int hours = numbers.get(0);
            int extraMinutes = numbers.size() > 1 ? numbers.get(1) : 0;
            minutes = (hours * 60) + extraMinutes;
        } else {
            minutes = numbers.get(0);
        }
        if (minutes <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duración del servicio inválida");
        }
        return minutes;
    }
}

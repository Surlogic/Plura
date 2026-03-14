package com.plura.plurabackend.core.billing.application;

import com.plura.plurabackend.core.booking.BookingCommandResponseAssembler;
import com.plura.plurabackend.core.booking.BookingCommandStateSupport;
import com.plura.plurabackend.core.booking.BookingFinancialCommandSupport;
import com.plura.plurabackend.core.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.core.booking.finance.BookingFinanceDispatchPlan;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.core.booking.finance.model.BookingPayoutStatus;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingPayoutApplicationService {

    private final BookingRepository bookingRepository;
    private final BookingFinanceService bookingFinanceService;
    private final ProfessionalAccessSupport professionalAccessSupport;
    private final BookingCommandStateSupport bookingCommandStateSupport;
    private final BookingFinancialCommandSupport bookingFinancialCommandSupport;
    private final BookingCommandResponseAssembler bookingCommandResponseAssembler;

    public BookingPayoutApplicationService(
        BookingRepository bookingRepository,
        BookingFinanceService bookingFinanceService,
        ProfessionalAccessSupport professionalAccessSupport,
        BookingCommandStateSupport bookingCommandStateSupport,
        BookingFinancialCommandSupport bookingFinancialCommandSupport,
        BookingCommandResponseAssembler bookingCommandResponseAssembler
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingFinanceService = bookingFinanceService;
        this.professionalAccessSupport = professionalAccessSupport;
        this.bookingCommandStateSupport = bookingCommandStateSupport;
        this.bookingFinancialCommandSupport = bookingFinancialCommandSupport;
        this.bookingCommandResponseAssembler = bookingCommandResponseAssembler;
    }

    @Transactional
    public BookingCommandResponse retryPayoutForProfessional(String rawUserId, Long bookingId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        Booking booking = bookingRepository.findDetailedByIdForUpdate(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        bookingCommandStateSupport.ensureProfessionalOwnsBooking(profile.getId(), booking);

        BookingPayoutRecord payoutRecord = bookingFinanceService.findLatestPayoutRecord(booking.getId());
        var refundRecord = bookingFinanceService.findLatestRefundRecord(booking.getId());
        if (payoutRecord == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La reserva no tiene payout para reintentar");
        }
        if (
            refundRecord != null
                && !"COMPLETED".equals(refundRecord.getStatus().name())
                && !"CANCELLED".equals(refundRecord.getStatus().name())
        ) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La reserva todavía tiene una devolución pendiente y no puede liberar payout"
            );
        }
        if (payoutRecord.getStatus() == null || payoutRecord.getStatus() == BookingPayoutStatus.COMPLETED) {
            return bookingCommandResponseAssembler.toRetryPayoutAlreadyCompleted(booking, payoutRecord);
        }

        BookingFinanceDispatchPlan financePlan = bookingFinancialCommandSupport.retryPayout(booking, payoutRecord);
        BookingCommandResponse response = bookingCommandResponseAssembler.toRetryPayoutProcessed(booking, financePlan.localResult());
        bookingFinancialCommandSupport.dispatchPlannedOperationsAfterCommit(booking, financePlan);
        return response;
    }
}

package com.plura.plurabackend.booking.finance.repository;

import com.plura.plurabackend.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.booking.finance.model.BookingFinancialStatus;
import com.plura.plurabackend.booking.model.ServicePaymentType;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingFinancialSummaryRepository extends JpaRepository<BookingFinancialSummary, Long> {
    Optional<BookingFinancialSummary> findByBooking_Id(Long bookingId);

    List<BookingFinancialSummary> findByBooking_IdIn(Collection<Long> bookingIds);

    List<BookingFinancialSummary> findByFinancialStatusAndUpdatedAtBefore(
        BookingFinancialStatus financialStatus,
        LocalDateTime updatedAt
    );

    @Query(
        """
        SELECT summary.booking.id
        FROM BookingFinancialSummary summary
        WHERE summary.financialStatus <> :financialStatus
        """
    )
    List<Long> findBookingIdsByFinancialStatusNot(@Param("financialStatus") BookingFinancialStatus financialStatus);

    @Query(
        """
        SELECT COUNT(summary.id)
        FROM BookingFinancialSummary summary
        JOIN summary.booking booking
        WHERE booking.professional = :professional
            AND booking.servicePaymentTypeSnapshot <> :excludedPaymentType
            AND summary.financialStatus IN :statuses
        """
    )
    long countOutstandingPaidBookingsForProfessional(
        @Param("professional") ProfessionalProfile professional,
        @Param("statuses") Collection<BookingFinancialStatus> statuses,
        @Param("excludedPaymentType") ServicePaymentType excludedPaymentType
    );
}

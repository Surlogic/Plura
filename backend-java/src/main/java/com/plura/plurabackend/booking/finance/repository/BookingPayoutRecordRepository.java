package com.plura.plurabackend.booking.finance.repository;

import com.plura.plurabackend.booking.finance.model.BookingPayoutRecord;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingPayoutRecordRepository extends JpaRepository<BookingPayoutRecord, String> {
    List<BookingPayoutRecord> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    Optional<BookingPayoutRecord> findTopByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    Optional<BookingPayoutRecord> findByProviderReference(String providerReference);

    Optional<BookingPayoutRecord> findByRelatedDecisionId(String relatedDecisionId);
}

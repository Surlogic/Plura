package com.plura.plurabackend.booking.finance.repository;

import com.plura.plurabackend.booking.finance.model.BookingRefundRecord;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRefundRecordRepository extends JpaRepository<BookingRefundRecord, String> {
    List<BookingRefundRecord> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    Optional<BookingRefundRecord> findTopByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    Optional<BookingRefundRecord> findByProviderReference(String providerReference);

    Optional<BookingRefundRecord> findByRelatedDecisionId(String relatedDecisionId);
}

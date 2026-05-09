package com.plura.plurabackend.core.booking.finance.repository;

import com.plura.plurabackend.core.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.core.booking.finance.model.BookingPayoutStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * BookingPayoutRecordRepository es un contrato interno del modulo reservas / finanzas / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: reservas.
 */
public interface BookingPayoutRecordRepository extends JpaRepository<BookingPayoutRecord, String> {
    List<BookingPayoutRecord> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    Optional<BookingPayoutRecord> findTopByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    Optional<BookingPayoutRecord> findByProviderReference(String providerReference);

    Optional<BookingPayoutRecord> findByRelatedDecisionId(String relatedDecisionId);

    @Query("SELECT p FROM BookingPayoutRecord p JOIN FETCH p.booking WHERE p.booking.id IN :bookingIds ORDER BY p.booking.id ASC, p.createdAt DESC")
    List<BookingPayoutRecord> findByBooking_IdInOrderByBooking_IdAscCreatedAtDesc(@Param("bookingIds") List<Long> bookingIds);

    List<BookingPayoutRecord> findByStatus(BookingPayoutStatus status);

    @Query(
        """
        SELECT DISTINCT payout.booking.id
        FROM BookingPayoutRecord payout
        WHERE payout.booking IS NOT NULL
        """
    )
    List<Long> findDistinctBookingIds();
}

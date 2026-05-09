package com.plura.plurabackend.core.booking.finance.repository;

import com.plura.plurabackend.core.booking.finance.model.BookingRefundRecord;
import com.plura.plurabackend.core.booking.finance.model.BookingRefundStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * BookingRefundRecordRepository es un contrato interno del modulo reservas / finanzas / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: reservas.
 */
public interface BookingRefundRecordRepository extends JpaRepository<BookingRefundRecord, String> {
    List<BookingRefundRecord> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    Optional<BookingRefundRecord> findTopByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    Optional<BookingRefundRecord> findByProviderReference(String providerReference);

    Optional<BookingRefundRecord> findByRelatedDecisionId(String relatedDecisionId);

    @Query("SELECT r FROM BookingRefundRecord r JOIN FETCH r.booking WHERE r.booking.id IN :bookingIds ORDER BY r.booking.id ASC, r.createdAt DESC")
    List<BookingRefundRecord> findByBooking_IdInOrderByBooking_IdAscCreatedAtDesc(@Param("bookingIds") List<Long> bookingIds);

    List<BookingRefundRecord> findByStatus(BookingRefundStatus status);

    @Query(
        """
        SELECT DISTINCT refund.booking.id
        FROM BookingRefundRecord refund
        WHERE refund.booking IS NOT NULL
        """
    )
    List<Long> findDistinctBookingIds();
}

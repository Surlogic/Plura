package com.plura.plurabackend.core.review.repository;

import com.plura.plurabackend.core.review.model.BookingReviewReminder;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * BookingReviewReminderRepository es un contrato interno del modulo resenas / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: reservas, resenas.
 */
public interface BookingReviewReminderRepository extends JpaRepository<BookingReviewReminder, Long> {
    Optional<BookingReviewReminder> findByBooking_Id(Long bookingId);
}

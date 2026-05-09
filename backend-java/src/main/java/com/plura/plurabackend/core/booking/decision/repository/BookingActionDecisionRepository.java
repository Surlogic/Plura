package com.plura.plurabackend.core.booking.decision.repository;

import com.plura.plurabackend.core.booking.decision.model.BookingActionDecision;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * BookingActionDecisionRepository es un contrato interno del modulo reservas / decisiones / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: reservas.
 */
public interface BookingActionDecisionRepository extends JpaRepository<BookingActionDecision, String> {
    List<BookingActionDecision> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);
}

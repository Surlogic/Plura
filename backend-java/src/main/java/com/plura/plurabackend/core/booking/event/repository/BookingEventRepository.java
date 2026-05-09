package com.plura.plurabackend.core.booking.event.repository;

import com.plura.plurabackend.core.booking.event.model.BookingEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * BookingEventRepository es un contrato interno del modulo reservas / eventos / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: reservas.
 */
public interface BookingEventRepository extends JpaRepository<BookingEvent, String> {
    List<BookingEvent> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);
}

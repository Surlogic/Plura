package com.plura.plurabackend.core.booking.idempotency.repository;

import com.plura.plurabackend.core.booking.decision.model.BookingActionType;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.idempotency.model.BookingCommandIdempotencyRecord;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * BookingCommandIdempotencyRepository es un contrato interno del modulo reservas / idempotencia / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: reservas.
 */
public interface BookingCommandIdempotencyRepository extends JpaRepository<BookingCommandIdempotencyRecord, Long> {
    Optional<BookingCommandIdempotencyRecord> findByActorTypeAndActorUserIdAndCommandTypeAndIdempotencyKey(
        BookingActorType actorType,
        Long actorUserId,
        BookingActionType commandType,
        String idempotencyKey
    );
}

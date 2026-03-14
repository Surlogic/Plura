package com.plura.plurabackend.core.booking.idempotency.repository;

import com.plura.plurabackend.core.booking.decision.model.BookingActionType;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.idempotency.model.BookingCommandIdempotencyRecord;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingCommandIdempotencyRepository extends JpaRepository<BookingCommandIdempotencyRecord, Long> {
    Optional<BookingCommandIdempotencyRecord> findByActorTypeAndActorUserIdAndCommandTypeAndIdempotencyKey(
        BookingActorType actorType,
        Long actorUserId,
        BookingActionType commandType,
        String idempotencyKey
    );
}

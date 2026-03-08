package com.plura.plurabackend.booking.idempotency.repository;

import com.plura.plurabackend.booking.decision.model.BookingActionType;
import com.plura.plurabackend.booking.event.model.BookingActorType;
import com.plura.plurabackend.booking.idempotency.model.BookingCommandIdempotencyRecord;
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

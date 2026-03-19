package com.plura.plurabackend.core.notification.repository;

import com.plura.plurabackend.core.notification.model.NotificationEvent;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationEventRepository extends JpaRepository<NotificationEvent, String> {

    Optional<NotificationEvent> findByDedupeKey(String dedupeKey);

    @Query(
        """
        SELECT event
        FROM NotificationEvent event
        WHERE event.recipientType = :recipientType
            AND event.recipientId = :recipientId
            AND (
                event.bookingReferenceId = :bookingReferenceId
                OR (
                    event.bookingReferenceId IS NULL
                    AND (
                        (event.aggregateType = :aggregateType AND event.aggregateId = :aggregateId)
                        OR event.payloadJson LIKE :bookingPayloadPattern
                    )
                )
            )
        ORDER BY event.occurredAt ASC, event.createdAt ASC
        """
    )
    List<NotificationEvent> findTimelineEventsForBooking(
        @Param("recipientType") NotificationRecipientType recipientType,
        @Param("recipientId") String recipientId,
        @Param("bookingReferenceId") Long bookingReferenceId,
        @Param("aggregateType") NotificationAggregateType aggregateType,
        @Param("aggregateId") String aggregateId,
        @Param("bookingPayloadPattern") String bookingPayloadPattern
    );
}

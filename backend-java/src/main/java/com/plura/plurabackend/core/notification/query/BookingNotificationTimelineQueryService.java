package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.repository.NotificationEventRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingNotificationTimelineQueryService {

    private final NotificationEventRepository notificationEventRepository;
    private final NotificationViewAssembler notificationViewAssembler;

    public BookingNotificationTimelineQueryService(
        NotificationEventRepository notificationEventRepository,
        NotificationViewAssembler notificationViewAssembler
    ) {
        this.notificationEventRepository = notificationEventRepository;
        this.notificationViewAssembler = notificationViewAssembler;
    }

    @Transactional(readOnly = true)
    public List<BookingNotificationTimelineItemView> listTimeline(
        NotificationRecipientType recipientType,
        String recipientId,
        Long bookingId
    ) {
        if (recipientType == null) {
            throw new IllegalArgumentException("recipientType es obligatorio");
        }
        if (recipientId == null || recipientId.trim().isBlank()) {
            throw new IllegalArgumentException("recipientId es obligatorio");
        }
        if (bookingId == null) {
            throw new IllegalArgumentException("bookingId es obligatorio");
        }
        return notificationEventRepository.findTimelineEventsForBooking(
            recipientType,
            recipientId.trim(),
            bookingId,
            NotificationAggregateType.BOOKING,
            String.valueOf(bookingId),
            "%\"bookingId\":" + bookingId + "%"
        ).stream().map(notificationViewAssembler::toTimelineItem).toList();
    }
}

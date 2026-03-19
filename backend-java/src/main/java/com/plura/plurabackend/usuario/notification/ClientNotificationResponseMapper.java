package com.plura.plurabackend.usuario.notification;

import com.plura.plurabackend.core.notification.query.BookingNotificationTimelineItemView;
import com.plura.plurabackend.core.notification.query.NotificationDetailView;
import com.plura.plurabackend.core.notification.query.NotificationInboxItemView;
import com.plura.plurabackend.core.notification.query.NotificationInboxPageView;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationDetailResponse;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationItemResponse;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationListResponse;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationTimelineItemResponse;
import com.plura.plurabackend.usuario.notification.dto.ClientNotificationTimelineResponse;
import org.springframework.stereotype.Component;

@Component
class ClientNotificationResponseMapper {

    ClientNotificationListResponse toListResponse(NotificationInboxPageView page) {
        return new ClientNotificationListResponse(
            page.page(),
            page.size(),
            page.total(),
            page.items().stream().map(this::toItemResponse).toList()
        );
    }

    ClientNotificationDetailResponse toDetailResponse(NotificationDetailView detail) {
        return new ClientNotificationDetailResponse(
            detail.id(),
            detail.notificationEventId(),
            detail.type(),
            detail.aggregateType(),
            detail.aggregateId(),
            detail.title(),
            detail.body(),
            detail.severity(),
            detail.category(),
            detail.actionUrl(),
            detail.actionLabel(),
            detail.occurredAt(),
            detail.createdAt(),
            detail.readAt(),
            detail.archivedAt(),
            detail.actorType(),
            detail.actorId(),
            detail.recipientType(),
            detail.recipientId(),
            detail.sourceModule(),
            detail.sourceAction(),
            detail.bookingId(),
            detail.payload()
        );
    }

    ClientNotificationTimelineResponse toTimelineResponse(
        Long bookingId,
        java.util.List<BookingNotificationTimelineItemView> items
    ) {
        return new ClientNotificationTimelineResponse(
            bookingId,
            items.stream().map(this::toTimelineItemResponse).toList()
        );
    }

    private ClientNotificationItemResponse toItemResponse(NotificationInboxItemView item) {
        return new ClientNotificationItemResponse(
            item.id(),
            item.type(),
            item.title(),
            item.body(),
            item.severity(),
            item.category(),
            item.createdAt(),
            item.readAt(),
            item.bookingId(),
            item.actionUrl()
        );
    }

    private ClientNotificationTimelineItemResponse toTimelineItemResponse(BookingNotificationTimelineItemView item) {
        return new ClientNotificationTimelineItemResponse(
            item.id(),
            item.eventUuid(),
            item.type(),
            item.aggregateType(),
            item.aggregateId(),
            item.sourceModule(),
            item.sourceAction(),
            item.actorType(),
            item.actorId(),
            item.recipientType(),
            item.recipientId(),
            item.occurredAt(),
            item.createdAt(),
            item.bookingId(),
            item.payload()
        );
    }
}

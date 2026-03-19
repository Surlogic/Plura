package com.plura.plurabackend.professional.notification;

import com.plura.plurabackend.core.notification.query.BookingNotificationTimelineItemView;
import com.plura.plurabackend.core.notification.query.NotificationDetailView;
import com.plura.plurabackend.core.notification.query.NotificationInboxItemView;
import com.plura.plurabackend.core.notification.query.NotificationInboxPageView;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationDetailResponse;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationItemResponse;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationListResponse;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationTimelineItemResponse;
import com.plura.plurabackend.professional.notification.dto.ProfessionalNotificationTimelineResponse;
import org.springframework.stereotype.Component;

@Component
class ProfessionalNotificationResponseMapper {

    ProfessionalNotificationListResponse toListResponse(NotificationInboxPageView page) {
        return new ProfessionalNotificationListResponse(
            page.page(),
            page.size(),
            page.total(),
            page.items().stream().map(this::toItemResponse).toList()
        );
    }

    ProfessionalNotificationDetailResponse toDetailResponse(NotificationDetailView detail) {
        return new ProfessionalNotificationDetailResponse(
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

    ProfessionalNotificationTimelineResponse toTimelineResponse(Long bookingId, java.util.List<BookingNotificationTimelineItemView> items) {
        return new ProfessionalNotificationTimelineResponse(
            bookingId,
            items.stream().map(this::toTimelineItemResponse).toList()
        );
    }

    private ProfessionalNotificationItemResponse toItemResponse(NotificationInboxItemView item) {
        return new ProfessionalNotificationItemResponse(
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

    private ProfessionalNotificationTimelineItemResponse toTimelineItemResponse(BookingNotificationTimelineItemView item) {
        return new ProfessionalNotificationTimelineItemResponse(
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

package com.plura.plurabackend.core.review;

import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.notification.application.NotificationInAppProjectionCommand;
import com.plura.plurabackend.core.notification.application.NotificationRecordCommand;
import com.plura.plurabackend.core.notification.application.NotificationService;
import com.plura.plurabackend.core.notification.model.NotificationActorType;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.model.NotificationSeverity;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipient;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipientGateway;
import com.plura.plurabackend.core.review.model.BookingReview;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ReviewNotificationIntegrationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ReviewNotificationIntegrationService.class);

    private final NotificationService notificationService;
    private final ProfessionalNotificationRecipientGateway professionalNotificationRecipientGateway;

    public ReviewNotificationIntegrationService(
        NotificationService notificationService,
        ProfessionalNotificationRecipientGateway professionalNotificationRecipientGateway
    ) {
        this.notificationService = notificationService;
        this.professionalNotificationRecipientGateway = professionalNotificationRecipientGateway;
    }

    public void notifyReviewReceived(BookingReview review, Booking booking) {
        ProfessionalNotificationRecipient recipient = professionalNotificationRecipientGateway
            .findNotificationRecipientByProfessionalId(review.getProfessional().getId())
            .orElseGet(() -> {
                LOGGER.warn("Professional notification recipient no encontrado para reviewId={} professionalId={}",
                    review.getId(), review.getProfessional().getId());
                return new ProfessionalNotificationRecipient(review.getProfessional().getId(), null, null);
            });

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("reviewId", review.getId());
        payload.put("bookingId", booking.getId());
        payload.put("rating", review.getRating());
        payload.put("serviceName", booking.getServiceNameSnapshot());
        payload.put("authorDisplayName", review.getUser().getFullName());

        String dedupeKey = NotificationEventType.REVIEW_RECEIVED.name()
            + ":review:" + review.getId()
            + ":recipient:" + recipient.professionalId();

        NotificationRecordCommand command = new NotificationRecordCommand(
            NotificationEventType.REVIEW_RECEIVED,
            NotificationAggregateType.REVIEW,
            String.valueOf(review.getId()),
            "review",
            "REVIEW_CREATED",
            NotificationRecipientType.PROFESSIONAL,
            String.valueOf(recipient.professionalId()),
            NotificationActorType.CLIENT,
            review.getUser() == null ? null : String.valueOf(review.getUser().getId()),
            booking.getId(),
            payload,
            dedupeKey,
            LocalDateTime.now(),
            new NotificationInAppProjectionCommand(
                "Nueva reseña",
                "Recibiste una reseña de " + review.getRating() + " estrella"
                    + (review.getRating() == 1 ? "" : "s")
                    + " por " + (booking.getServiceNameSnapshot() != null ? booking.getServiceNameSnapshot() : "la reserva") + ".",
                NotificationSeverity.INFO,
                "REVIEW",
                "/profesional/dashboard/resenas",
                "Ver reseñas"
            ),
            null
        );

        notificationService.record(command);
    }
}

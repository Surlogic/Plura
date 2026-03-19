package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.AppNotification;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEvent;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

final class NotificationInboxSpecifications {

    private NotificationInboxSpecifications() {
    }

    static Specification<AppNotification> forInbox(NotificationInboxQuery query) {
        return (root, criteriaQuery, criteriaBuilder) -> {
            Join<AppNotification, NotificationEvent> event = root.join("notificationEvent");
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("recipientType"), query.recipientType()));
            predicates.add(criteriaBuilder.equal(root.get("recipientId"), query.recipientId()));

            if (query.status() == NotificationInboxStatus.UNREAD) {
                predicates.add(criteriaBuilder.isNull(root.get("readAt")));
            } else if (query.status() == NotificationInboxStatus.READ) {
                predicates.add(criteriaBuilder.isNotNull(root.get("readAt")));
            }

            if (query.types() != null && !query.types().isEmpty()) {
                predicates.add(event.get("eventType").in(query.types()));
            }

            if (query.bookingId() != null) {
                String bookingId = String.valueOf(query.bookingId());
                predicates.add(
                    criteriaBuilder.or(
                        criteriaBuilder.and(
                            criteriaBuilder.equal(event.get("aggregateType"), NotificationAggregateType.BOOKING),
                            criteriaBuilder.equal(event.get("aggregateId"), bookingId)
                        ),
                        criteriaBuilder.like(event.get("payloadJson"), "%\"bookingId\":" + bookingId + "%")
                    )
                );
            }

            if (query.from() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), query.from()));
            }
            if (query.to() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), query.to()));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }
}

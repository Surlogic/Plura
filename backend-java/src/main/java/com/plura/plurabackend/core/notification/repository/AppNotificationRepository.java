package com.plura.plurabackend.core.notification.repository;

import com.plura.plurabackend.core.notification.model.AppNotification;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppNotificationRepository extends JpaRepository<AppNotification, String>, JpaSpecificationExecutor<AppNotification> {

    Optional<AppNotification> findByNotificationEvent_Id(String notificationEventId);

    Optional<AppNotification> findByIdAndRecipientTypeAndRecipientId(
        String id,
        NotificationRecipientType recipientType,
        String recipientId
    );

    long countByRecipientTypeAndRecipientIdAndReadAtIsNull(
        NotificationRecipientType recipientType,
        String recipientId
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
        """
        UPDATE AppNotification notification
        SET notification.readAt = :readAt
        WHERE notification.id = :notificationId
            AND notification.recipientType = :recipientType
            AND notification.recipientId = :recipientId
            AND notification.readAt IS NULL
        """
    )
    int markAsReadIfUnread(
        @Param("notificationId") String notificationId,
        @Param("recipientType") NotificationRecipientType recipientType,
        @Param("recipientId") String recipientId,
        @Param("readAt") LocalDateTime readAt
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
        """
        UPDATE AppNotification notification
        SET notification.readAt = :readAt
        WHERE notification.recipientType = :recipientType
            AND notification.recipientId = :recipientId
            AND notification.readAt IS NULL
        """
    )
    int markAllAsRead(
        @Param("recipientType") NotificationRecipientType recipientType,
        @Param("recipientId") String recipientId,
        @Param("readAt") LocalDateTime readAt
    );
}

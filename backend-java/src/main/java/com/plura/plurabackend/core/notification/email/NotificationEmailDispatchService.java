package com.plura.plurabackend.core.notification.email;

import com.plura.plurabackend.core.notification.model.EmailDispatch;
import com.plura.plurabackend.core.notification.model.EmailDispatchStatus;
import com.plura.plurabackend.core.notification.metrics.NotificationMetricsService;
import com.plura.plurabackend.core.notification.repository.EmailDispatchRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationEmailDispatchService {

    private static final Logger LOGGER = LoggerFactory.getLogger(NotificationEmailDispatchService.class);

    private final EmailDispatchRepository emailDispatchRepository;
    private final NotificationMetricsService notificationMetricsService;

    public NotificationEmailDispatchService(
        EmailDispatchRepository emailDispatchRepository,
        NotificationMetricsService notificationMetricsService
    ) {
        this.emailDispatchRepository = emailDispatchRepository;
        this.notificationMetricsService = notificationMetricsService;
    }

    @Transactional(readOnly = true)
    public List<EmailDispatch> findDueDispatches(int limit) {
        return emailDispatchRepository.findDueDispatches(
            List.of(
                EmailDispatchStatus.PENDING,
                EmailDispatchStatus.RETRY_SCHEDULED,
                EmailDispatchStatus.PROCESSING
            ),
            LocalDateTime.now(),
            PageRequest.of(0, Math.max(1, limit))
        );
    }

    @Transactional(readOnly = true)
    public EmailDispatch getRequiredDetailed(String dispatchId) {
        return emailDispatchRepository.findDetailedById(dispatchId)
            .orElseThrow(() -> new IllegalStateException("Email dispatch no encontrado"));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public EmailDispatch claimDispatch(String dispatchId, String workerId, LocalDateTime leaseUntil) {
        LocalDateTime now = LocalDateTime.now();
        int claimed = emailDispatchRepository.claimDispatch(
            dispatchId,
            List.of(
                EmailDispatchStatus.PENDING,
                EmailDispatchStatus.RETRY_SCHEDULED,
                EmailDispatchStatus.PROCESSING
            ),
            EmailDispatchStatus.PROCESSING,
            workerId,
            now,
            leaseUntil
        );
        if (claimed == 0) {
            return null;
        }
        EmailDispatch dispatch = getRequiredDetailed(dispatchId);
        LOGGER.info(
            "Notification email dispatch claimed dispatchId={} eventType={} templateKey={} attemptCount={} workerId={} leaseUntil={}",
            dispatch.getId(),
            dispatch.getNotificationEvent().getEventType(),
            dispatch.getTemplateKey(),
            dispatch.getAttemptCount(),
            workerId,
            dispatch.getLeaseUntil()
        );
        notificationMetricsService.refreshEmailDispatchStatusGauges();
        return dispatch;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean renewLease(String dispatchId, String workerId, LocalDateTime leaseUntil) {
        return emailDispatchRepository.renewLease(
            dispatchId,
            EmailDispatchStatus.PROCESSING,
            workerId,
            LocalDateTime.now(),
            leaseUntil
        ) > 0;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public EmailDispatch markSent(String dispatchId, String providerMessageId) {
        EmailDispatch dispatch = getRequiredDetailed(dispatchId);
        dispatch.setStatus(EmailDispatchStatus.SENT);
        dispatch.setProviderMessageId(normalize(providerMessageId));
        dispatch.setSentAt(LocalDateTime.now());
        dispatch.setNextAttemptAt(null);
        dispatch.setErrorCode(null);
        dispatch.setErrorMessage(null);
        clearLease(dispatch);
        EmailDispatch saved = emailDispatchRepository.save(dispatch);
        LOGGER.info(
            "Notification email dispatch sent dispatchId={} eventType={} templateKey={} attempts={}",
            saved.getId(),
            saved.getNotificationEvent().getEventType(),
            saved.getTemplateKey(),
            saved.getAttemptCount()
        );
        notificationMetricsService.recordEmailSent(saved);
        return saved;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public EmailDispatch markRetryScheduled(
        String dispatchId,
        String errorCode,
        String errorMessage,
        LocalDateTime nextAttemptAt
    ) {
        EmailDispatch dispatch = getRequiredDetailed(dispatchId);
        dispatch.setStatus(EmailDispatchStatus.RETRY_SCHEDULED);
        dispatch.setErrorCode(normalize(errorCode));
        dispatch.setErrorMessage(truncate(errorMessage, 1000));
        dispatch.setNextAttemptAt(nextAttemptAt);
        dispatch.setSentAt(null);
        clearLease(dispatch);
        EmailDispatch saved = emailDispatchRepository.save(dispatch);
        LOGGER.warn(
            "Notification email retry scheduled dispatchId={} eventType={} templateKey={} attempts={} nextAttemptAt={} errorCode={}",
            saved.getId(),
            saved.getNotificationEvent().getEventType(),
            saved.getTemplateKey(),
            saved.getAttemptCount(),
            saved.getNextAttemptAt(),
            saved.getErrorCode()
        );
        notificationMetricsService.recordEmailRetryScheduled(saved, saved.getErrorCode());
        return saved;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public EmailDispatch markFailed(String dispatchId, String errorCode, String errorMessage) {
        EmailDispatch dispatch = getRequiredDetailed(dispatchId);
        dispatch.setStatus(EmailDispatchStatus.FAILED);
        dispatch.setErrorCode(normalize(errorCode));
        dispatch.setErrorMessage(truncate(errorMessage, 1000));
        dispatch.setNextAttemptAt(null);
        dispatch.setSentAt(null);
        clearLease(dispatch);
        EmailDispatch saved = emailDispatchRepository.save(dispatch);
        LOGGER.error(
            "Notification email dispatch failed dispatchId={} eventType={} templateKey={} attempts={} errorCode={}",
            saved.getId(),
            saved.getNotificationEvent().getEventType(),
            saved.getTemplateKey(),
            saved.getAttemptCount(),
            saved.getErrorCode()
        );
        notificationMetricsService.recordEmailFailed(saved, saved.getErrorCode());
        return saved;
    }

    private void clearLease(EmailDispatch dispatch) {
        dispatch.setLockedBy(null);
        dispatch.setLockedAt(null);
        dispatch.setLeaseUntil(null);
    }

    private String normalize(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, maxLength);
    }
}

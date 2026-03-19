package com.plura.plurabackend.core.notification.dispatch;

import com.plura.plurabackend.core.notification.email.NotificationEmailDispatchService;
import com.plura.plurabackend.core.notification.email.NotificationEmailRetryPolicy;
import com.plura.plurabackend.core.notification.email.NotificationEmailSendResult;
import com.plura.plurabackend.core.notification.email.NotificationEmailSendStatus;
import com.plura.plurabackend.core.notification.email.NotificationEmailSender;
import com.plura.plurabackend.core.notification.email.NotificationEmailTemplateException;
import com.plura.plurabackend.core.notification.email.NotificationEmailTemplateService;
import com.plura.plurabackend.core.notification.metrics.NotificationMetricsService;
import com.plura.plurabackend.core.notification.model.EmailDispatch;
import java.lang.management.ManagementFactory;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class NotificationEmailWorker {

    private static final Logger LOGGER = LoggerFactory.getLogger(NotificationEmailWorker.class);

    private final NotificationEmailDispatchService notificationEmailDispatchService;
    private final NotificationEmailTemplateService notificationEmailTemplateService;
    private final NotificationEmailSender notificationEmailSender;
    private final NotificationEmailRetryPolicy notificationEmailRetryPolicy;
    private final NotificationMetricsService notificationMetricsService;
    private final int batchSize;
    private final Duration leaseDuration;
    private final String workerId;

    public NotificationEmailWorker(
        NotificationEmailDispatchService notificationEmailDispatchService,
        NotificationEmailTemplateService notificationEmailTemplateService,
        NotificationEmailSender notificationEmailSender,
        NotificationEmailRetryPolicy notificationEmailRetryPolicy,
        NotificationMetricsService notificationMetricsService,
        @Value("${app.notification.email-worker.batch-size:10}") int batchSize,
        @Value("${app.notification.email-worker.lease-seconds:120}") long leaseSeconds
    ) {
        this.notificationEmailDispatchService = notificationEmailDispatchService;
        this.notificationEmailTemplateService = notificationEmailTemplateService;
        this.notificationEmailSender = notificationEmailSender;
        this.notificationEmailRetryPolicy = notificationEmailRetryPolicy;
        this.notificationMetricsService = notificationMetricsService;
        this.batchSize = Math.max(1, batchSize);
        this.leaseDuration = Duration.ofSeconds(Math.max(30L, leaseSeconds));
        this.workerId = ManagementFactory.getRuntimeMXBean().getName() + ":notification-email:" + UUID.randomUUID();
    }

    @Scheduled(fixedDelayString = "${app.notification.email-worker.delay-millis:5000}")
    public void drainScheduledBatch() {
        List<EmailDispatch> dueDispatches = notificationEmailDispatchService.findDueDispatches(batchSize);
        for (EmailDispatch dueDispatch : dueDispatches) {
            try {
                kickDispatchAsync(dueDispatch.getId());
            } catch (RuntimeException exception) {
                LOGGER.error(
                    "Notification email batch scheduling failed dispatchId={} templateKey={}",
                    dueDispatch.getId(),
                    dueDispatch.getTemplateKey(),
                    exception
                );
            }
        }
    }

    @Async("notificationEmailExecutor")
    public CompletableFuture<Boolean> kickDispatchAsync(String dispatchId) {
        return CompletableFuture.completedFuture(claimAndProcess(dispatchId));
    }

    boolean claimAndProcess(String dispatchId) {
        EmailDispatch claimed = notificationEmailDispatchService.claimDispatch(
            dispatchId,
            workerId,
            LocalDateTime.now().plus(leaseDuration)
        );
        if (claimed == null) {
            return false;
        }
        LOGGER.info(
            "Notification email processing started dispatchId={} eventType={} templateKey={} attemptCount={} workerId={}",
            claimed.getId(),
            claimed.getNotificationEvent().getEventType(),
            claimed.getTemplateKey(),
            claimed.getAttemptCount(),
            workerId
        );
        try {
            NotificationEmailSendResult sendResult = notificationEmailSender.send(
                notificationEmailTemplateService.buildMessage(claimed)
            );
            applySendResult(claimed, sendResult);
            return true;
        } catch (NotificationEmailTemplateException exception) {
            notificationMetricsService.recordEmailRetriesExhausted(claimed, "template_render_error");
            notificationEmailDispatchService.markFailed(claimed.getId(), "template_render_error", exception.getMessage());
            return false;
        } catch (RuntimeException exception) {
            scheduleRetryOrFail(claimed, "worker_unexpected_error", exception.getMessage());
            return false;
        }
    }

    private void applySendResult(EmailDispatch claimed, NotificationEmailSendResult sendResult) {
        if (sendResult == null) {
            scheduleRetryOrFail(claimed, "null_send_result", "NotificationEmailSender devolvió null");
            return;
        }
        if (sendResult.status() == NotificationEmailSendStatus.SENT) {
            notificationEmailDispatchService.markSent(claimed.getId(), sendResult.providerMessageId());
            return;
        }
        if (sendResult.status() == NotificationEmailSendStatus.FAILED_PERMANENT) {
            notificationEmailDispatchService.markFailed(claimed.getId(), sendResult.errorCode(), sendResult.errorMessage());
            return;
        }
        scheduleRetryOrFail(claimed, sendResult.errorCode(), sendResult.errorMessage());
    }

    private void scheduleRetryOrFail(EmailDispatch claimed, String errorCode, String errorMessage) {
        NotificationEmailRetryPolicy.RetryDecision decision = notificationEmailRetryPolicy.evaluateNextAttempt(
            claimed.getAttemptCount(),
            LocalDateTime.now()
        );
        if (decision.shouldRetry()) {
            notificationEmailDispatchService.markRetryScheduled(
                claimed.getId(),
                errorCode,
                errorMessage,
                decision.nextAttemptAt()
            );
            return;
        }
        notificationMetricsService.recordEmailRetriesExhausted(claimed, errorCode);
        notificationEmailDispatchService.markFailed(claimed.getId(), errorCode, errorMessage);
    }
}

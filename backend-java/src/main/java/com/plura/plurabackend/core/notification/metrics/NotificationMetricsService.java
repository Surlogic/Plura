package com.plura.plurabackend.core.notification.metrics;

import com.plura.plurabackend.core.notification.model.EmailDispatch;
import com.plura.plurabackend.core.notification.model.EmailDispatchStatus;
import com.plura.plurabackend.core.notification.model.NotificationEvent;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.repository.EmailDispatchRepository;
import com.plura.plurabackend.core.notification.repository.NotificationEventRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.EnumMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class NotificationMetricsService {

    private final MeterRegistry meterRegistry;
    private final EmailDispatchRepository emailDispatchRepository;
    private final NotificationEventRepository notificationEventRepository;
    private final Map<EmailDispatchStatus, AtomicLong> emailDispatchStatusGauges = new EnumMap<>(EmailDispatchStatus.class);
    private final AtomicLong notificationEventCountGauge = new AtomicLong(0L);

    public NotificationMetricsService(
        MeterRegistry meterRegistry,
        EmailDispatchRepository emailDispatchRepository,
        NotificationEventRepository notificationEventRepository
    ) {
        this.meterRegistry = meterRegistry;
        this.emailDispatchRepository = emailDispatchRepository;
        this.notificationEventRepository = notificationEventRepository;
        for (EmailDispatchStatus status : EmailDispatchStatus.values()) {
            AtomicLong gaugeValue = new AtomicLong(0L);
            emailDispatchStatusGauges.put(status, gaugeValue);
            Gauge.builder("plura.notification.email.dispatch.count", gaugeValue, AtomicLong::get)
                .tag("status", status.name())
                .register(meterRegistry);
        }
        Gauge.builder("plura.notification.events.persisted.count", notificationEventCountGauge, AtomicLong::get)
            .register(meterRegistry);
        refreshGauges();
    }

    public void recordNotificationCreated(NotificationEvent event) {
        Counter.builder("plura.notification.events.created")
            .tag("event_type", event.getEventType().name())
            .tag("source_module", event.getSourceModule())
            .register(meterRegistry)
            .increment();
        refreshNotificationEventGauge();
    }

    public void recordNotificationDeduplicated(NotificationEventType eventType, String sourceModule) {
        Counter.builder("plura.notification.events.deduplicated")
            .tag("event_type", eventType == null ? "UNKNOWN" : eventType.name())
            .tag("source_module", normalizeTag(sourceModule))
            .register(meterRegistry)
            .increment();
    }

    public void recordEmailSent(EmailDispatch dispatch) {
        Counter.builder("plura.notification.email.sent")
            .tag("event_type", dispatch.getNotificationEvent().getEventType().name())
            .tag("template_key", normalizeTag(dispatch.getTemplateKey()))
            .register(meterRegistry)
            .increment();
        refreshEmailDispatchStatusGauges();
    }

    public void recordEmailRetryScheduled(EmailDispatch dispatch, String errorCode) {
        Counter.builder("plura.notification.email.retry.scheduled")
            .tag("event_type", dispatch.getNotificationEvent().getEventType().name())
            .tag("template_key", normalizeTag(dispatch.getTemplateKey()))
            .tag("error_code", normalizeTag(errorCode))
            .register(meterRegistry)
            .increment();
        recordCategorizedFailure(errorCode);
        refreshEmailDispatchStatusGauges();
    }

    public void recordEmailFailed(EmailDispatch dispatch, String errorCode) {
        Counter.builder("plura.notification.email.failed")
            .tag("event_type", dispatch.getNotificationEvent().getEventType().name())
            .tag("template_key", normalizeTag(dispatch.getTemplateKey()))
            .tag("error_code", normalizeTag(errorCode))
            .register(meterRegistry)
            .increment();
        recordCategorizedFailure(errorCode);
        refreshEmailDispatchStatusGauges();
    }

    public void recordEmailRetriesExhausted(EmailDispatch dispatch, String errorCode) {
        Counter.builder("plura.notification.email.retries.exhausted")
            .tag("event_type", dispatch.getNotificationEvent().getEventType().name())
            .tag("template_key", normalizeTag(dispatch.getTemplateKey()))
            .tag("error_code", normalizeTag(errorCode))
            .register(meterRegistry)
            .increment();
    }

    public void refreshEmailDispatchStatusGauges() {
        for (EmailDispatchStatus status : EmailDispatchStatus.values()) {
            emailDispatchStatusGauges.get(status).set(emailDispatchRepository.countByStatus(status));
        }
    }

    @Scheduled(fixedDelayString = "${app.notification.metrics.refresh-millis:30000}")
    public void refreshGauges() {
        refreshEmailDispatchStatusGauges();
        refreshNotificationEventGauge();
    }

    private void refreshNotificationEventGauge() {
        notificationEventCountGauge.set(notificationEventRepository.count());
    }

    private void recordCategorizedFailure(String errorCode) {
        String normalizedErrorCode = normalizeTag(errorCode);
        if ("template_render_error".equals(normalizedErrorCode)) {
            Counter.builder("plura.notification.email.template.failures")
                .register(meterRegistry)
                .increment();
            return;
        }
        if (normalizedErrorCode.startsWith("smtp_")) {
            Counter.builder("plura.notification.email.smtp.failures")
                .tag("error_code", normalizedErrorCode)
                .register(meterRegistry)
                .increment();
        }
    }

    private String normalizeTag(String value) {
        if (value == null || value.trim().isBlank()) {
            return "unknown";
        }
        return value.trim();
    }
}

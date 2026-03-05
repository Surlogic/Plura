package com.plura.plurabackend.availability;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.availability.repository.AvailableSlotRepository;
import com.plura.plurabackend.jobs.JobType;
import com.plura.plurabackend.jobs.QueueJobMessage;
import com.plura.plurabackend.jobs.sqs.SqsJobQueueService;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleSummaryService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ScheduleSummaryService.class);

    private final AvailableSlotRepository availableSlotRepository;
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final SqsJobQueueService sqsJobQueueService;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final ZoneId appZoneId;
    private final int lookaheadDays;
    private final boolean summaryEnabled;
    private final boolean sqsEnabled;
    private final boolean summarySqsEnabled;
    private final AtomicReference<Double> nullRatioGauge = new AtomicReference<>(0d);

    public ScheduleSummaryService(
        AvailableSlotRepository availableSlotRepository,
        ProfessionalProfileRepository professionalProfileRepository,
        SqsJobQueueService sqsJobQueueService,
        ObjectMapper objectMapper,
        MeterRegistry meterRegistry,
        @Value("${app.timezone:America/Montevideo}") String appTimezone,
        @Value("${app.availability.summary-lookahead-days:14}") int lookaheadDays,
        @Value("${feature.availability.summary-enabled:false}") boolean summaryEnabled,
        @Value("${app.sqs.enabled:false}") boolean sqsEnabled,
        @Value("${jobs.sqs.schedule-summary-enabled:false}") boolean summarySqsEnabled
    ) {
        this.availableSlotRepository = availableSlotRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.sqsJobQueueService = sqsJobQueueService;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
        this.appZoneId = ZoneId.of(appTimezone);
        this.lookaheadDays = Math.max(1, lookaheadDays);
        this.summaryEnabled = summaryEnabled;
        this.sqsEnabled = sqsEnabled;
        this.summarySqsEnabled = summarySqsEnabled;

        Gauge.builder("plura.schedule.summary.next_available_at.null.ratio", nullRatioGauge, AtomicReference::get)
            .description("Ratio of active professionals without next_available_at")
            .register(meterRegistry);
    }

    public boolean isSummaryEnabled() {
        return summaryEnabled;
    }

    public void requestRebuild(Long professionalId) {
        if (!summaryEnabled || professionalId == null) {
            return;
        }

        if (sqsEnabled && summarySqsEnabled && sqsJobQueueService.isEnabled()) {
            try {
                String payload = objectMapper.writeValueAsString(new ScheduleSummaryPayload(professionalId));
                QueueJobMessage job = QueueJobMessage.now(
                    deterministicJobId(professionalId),
                    JobType.SCHEDULE_SUMMARY_REBUILD,
                    payload
                );
                if (sqsJobQueueService.publish(job)) {
                    return;
                }
            } catch (JsonProcessingException exception) {
                LOGGER.warn("Failed to serialize schedule summary payload, fallback to local", exception);
            }
        }

        rebuildProfessionalSummary(professionalId);
    }

    public void handleQueuedRebuildPayload(String payload) throws JsonProcessingException {
        ScheduleSummaryPayload parsed = objectMapper.readValue(payload, ScheduleSummaryPayload.class);
        if (parsed != null && parsed.professionalId() != null) {
            rebuildProfessionalSummary(parsed.professionalId());
        }
    }

    @Transactional
    public void rebuildProfessionalSummary(Long professionalId) {
        if (!summaryEnabled || professionalId == null) {
            return;
        }

        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            LocalDateTime now = LocalDateTime.now(appZoneId);
            LocalDateTime horizon = now.plusDays(lookaheadDays);
            Optional<LocalDateTime> nextAvailable = availableSlotRepository.findNextAvailableStartAt(
                professionalId,
                now,
                horizon
            );
            boolean hasToday = nextAvailable
                .map(LocalDateTime::toLocalDate)
                .map(date -> date.equals(LocalDate.now(appZoneId)))
                .orElse(false);
            professionalProfileRepository.updateAvailabilitySummary(
                professionalId,
                hasToday,
                nextAvailable.orElse(null)
            );
        } catch (RuntimeException exception) {
            markError("rebuild");
            throw exception;
        } finally {
            sample.stop(
                Timer.builder("plura.schedule.summary.rebuild.duration")
                    .description("Schedule summary rebuild duration")
                    .register(meterRegistry)
            );
        }
    }

    @Transactional
    public void rebuildAllIncremental(int pageSize) {
        if (!summaryEnabled) {
            return;
        }

        int size = Math.max(1, Math.min(500, pageSize));
        int page = 0;
        while (true) {
            List<ProfessionalProfile> profiles = professionalProfileRepository.findByActiveTrueOrderByCreatedAtDesc(
                PageRequest.of(page, size)
            );
            if (profiles.isEmpty()) {
                break;
            }
            for (ProfessionalProfile profile : profiles) {
                rebuildProfessionalSummary(profile.getId());
            }
            if (profiles.size() < size) {
                break;
            }
            page++;
        }
        refreshNullRatioGauge();
    }

    public void refreshNullRatioGauge() {
        long active = professionalProfileRepository.countByActiveTrue();
        if (active <= 0) {
            nullRatioGauge.set(0d);
            return;
        }
        long withoutNextAvailable = professionalProfileRepository.countActiveWithNextAvailableAtNull();
        nullRatioGauge.set((double) withoutNextAvailable / (double) active);
    }

    private void markError(String operation) {
        Counter.builder("plura.schedule.summary.rebuild.errors")
            .description("Schedule summary rebuild errors")
            .tag("operation", operation)
            .register(meterRegistry)
            .increment();
    }

    private String deterministicJobId(Long professionalId) {
        return "schedule-summary:" + sha256(String.valueOf(professionalId));
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte b : bytes) {
                result.append(String.format("%02x", b));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    public record ScheduleSummaryPayload(Long professionalId) {}
}

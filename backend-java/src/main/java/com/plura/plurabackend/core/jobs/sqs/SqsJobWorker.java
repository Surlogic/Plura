package com.plura.plurabackend.core.jobs.sqs;

import com.plura.plurabackend.core.availability.ScheduleSummaryService;
import com.plura.plurabackend.core.jobs.JobIdempotencyService;
import com.plura.plurabackend.core.jobs.JobType;
import com.plura.plurabackend.core.jobs.QueueJobMessage;
import com.plura.plurabackend.core.search.engine.SearchIndexWorker;
import com.plura.plurabackend.core.storage.thumbnail.ImageThumbnailJobService;
import com.plura.plurabackend.core.storage.thumbnail.SqsBackedImageThumbnailJobService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SqsJobWorker {

    private static final Logger LOGGER = LoggerFactory.getLogger(SqsJobWorker.class);

    private final SqsJobQueueService queueService;
    private final JobIdempotencyService idempotencyService;
    private final SqsBackedImageThumbnailJobService thumbnailJobService;
    private final ImageThumbnailJobService localImageThumbnailJobService;
    private final ObjectProvider<ScheduleSummaryService> scheduleSummaryServiceProvider;
    private final ObjectProvider<SearchIndexWorker> searchIndexWorkerProvider;
    private final boolean sqsEnabled;

    public SqsJobWorker(
        SqsJobQueueService queueService,
        JobIdempotencyService idempotencyService,
        SqsBackedImageThumbnailJobService thumbnailJobService,
        @Qualifier("localImageThumbnailJobService") ImageThumbnailJobService localImageThumbnailJobService,
        ObjectProvider<ScheduleSummaryService> scheduleSummaryServiceProvider,
        ObjectProvider<SearchIndexWorker> searchIndexWorkerProvider,
        @Value("${app.sqs.enabled:false}") boolean sqsEnabled
    ) {
        this.queueService = queueService;
        this.idempotencyService = idempotencyService;
        this.thumbnailJobService = thumbnailJobService;
        this.localImageThumbnailJobService = localImageThumbnailJobService;
        this.scheduleSummaryServiceProvider = scheduleSummaryServiceProvider;
        this.searchIndexWorkerProvider = searchIndexWorkerProvider;
        this.sqsEnabled = sqsEnabled;
    }

    @Scheduled(fixedDelayString = "${app.sqs.worker-delay-millis:1000}")
    public void pollQueue() {
        if (!sqsEnabled || !queueService.isEnabled()) {
            return;
        }
        for (SqsJobQueueService.ReceivedJob received : queueService.poll()) {
            QueueJobMessage message = received.message();
            try {
                if (!idempotencyService.shouldProcess(message.jobId())) {
                    queueService.ack(received.receiptHandle());
                    continue;
                }
                handleMessage(message);
                queueService.ack(received.receiptHandle());
            } catch (Exception exception) {
                LOGGER.warn("SQS job failed, moving to DLQ. type={} jobId={}", message.type(), message.jobId(), exception);
                queueService.moveToDlq(message, "PROCESSING_ERROR");
                queueService.ack(received.receiptHandle());
            }
        }
    }

    private void handleMessage(QueueJobMessage message) throws Exception {
        if (message == null || message.type() == null) {
            return;
        }
        JobType type = message.type();
        switch (type) {
            case THUMBNAIL -> {
                SqsBackedImageThumbnailJobService.ThumbnailPayload payload = thumbnailJobService.readPayload(message.payload());
                if (payload != null && payload.objectKey() != null) {
                    localImageThumbnailJobService.generateThumbnailsAsync(payload.objectKey());
                }
            }
            case SCHEDULE_SUMMARY_REBUILD -> {
                ScheduleSummaryService scheduleSummaryService = scheduleSummaryServiceProvider.getIfAvailable();
                if (scheduleSummaryService != null) {
                    scheduleSummaryService.handleQueuedRebuildPayload(message.payload());
                }
            }
            case SEARCH_INDEX_SYNC -> {
                SearchIndexWorker worker = searchIndexWorkerProvider.getIfAvailable();
                if (worker != null) {
                    worker.handleQueuedSyncPayload(message.payload());
                }
            }
            default -> LOGGER.warn("Unsupported queue message type {}", type);
        }
    }
}

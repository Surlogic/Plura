package com.plura.plurabackend.core.storage.thumbnail;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.jobs.JobType;
import com.plura.plurabackend.core.jobs.QueueJobMessage;
import com.plura.plurabackend.core.jobs.sqs.SqsJobQueueService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Service
@Primary
public class SqsBackedImageThumbnailJobService implements ImageThumbnailJobService {

    private static final Logger LOGGER = LoggerFactory.getLogger(SqsBackedImageThumbnailJobService.class);

    private final ImageThumbnailJobService localImageThumbnailJobService;
    private final SqsJobQueueService sqsJobQueueService;
    private final ObjectMapper objectMapper;
    private final boolean sqsEnabled;
    private final boolean thumbnailSqsEnabled;

    public SqsBackedImageThumbnailJobService(
        @Qualifier("localImageThumbnailJobService") ImageThumbnailJobService localImageThumbnailJobService,
        SqsJobQueueService sqsJobQueueService,
        ObjectMapper objectMapper,
        @Value("${app.sqs.enabled:false}") boolean sqsEnabled,
        @Value("${jobs.sqs.thumbnail-enabled:false}") boolean thumbnailSqsEnabled
    ) {
        this.localImageThumbnailJobService = localImageThumbnailJobService;
        this.sqsJobQueueService = sqsJobQueueService;
        this.objectMapper = objectMapper;
        this.sqsEnabled = sqsEnabled;
        this.thumbnailSqsEnabled = thumbnailSqsEnabled;
    }

    @Override
    public void generateThumbnailsAsync(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }

        if (sqsEnabled && thumbnailSqsEnabled && sqsJobQueueService.isEnabled()) {
            try {
                String normalized = objectKey.trim();
                ThumbnailPayload payload = new ThumbnailPayload(normalized);
                String serialized = objectMapper.writeValueAsString(payload);
                QueueJobMessage job = QueueJobMessage.now(
                    deterministicJobId(normalized),
                    JobType.THUMBNAIL,
                    serialized
                );
                if (sqsJobQueueService.publish(job)) {
                    return;
                }
            } catch (JsonProcessingException exception) {
                LOGGER.warn("Failed to serialize thumbnail SQS payload, fallback to local async", exception);
            }
        }

        localImageThumbnailJobService.generateThumbnailsAsync(objectKey);
    }

    public ThumbnailPayload readPayload(String jsonPayload) throws JsonProcessingException {
        return objectMapper.readValue(jsonPayload, ThumbnailPayload.class);
    }

    private String deterministicJobId(String objectKey) {
        return "thumbnail:" + sha256(objectKey);
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

    public record ThumbnailPayload(String objectKey) {}
}

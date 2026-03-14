package com.plura.plurabackend.core.jobs.sqs;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.jobs.QueueJobMessage;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

@Service
public class SqsJobQueueService {

    private static final Logger LOGGER = LoggerFactory.getLogger(SqsJobQueueService.class);

    private final Optional<SqsClient> sqsClient;
    private final SqsProperties properties;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    public SqsJobQueueService(
        Optional<SqsClient> sqsClient,
        SqsProperties properties,
        ObjectMapper objectMapper,
        MeterRegistry meterRegistry
    ) {
        this.sqsClient = sqsClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
    }

    public boolean isEnabled() {
        return properties.isEnabled() && sqsClient.isPresent() && hasText(properties.getQueueUrl());
    }

    public boolean publish(QueueJobMessage message) {
        if (!isEnabled() || message == null) {
            return false;
        }
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            String body = objectMapper.writeValueAsString(message);
            sqsClient.get().sendMessage(
                SendMessageRequest.builder()
                    .queueUrl(properties.getQueueUrl())
                    .messageBody(body)
                    .build()
            );
            return true;
        } catch (Exception exception) {
            markError("publish");
            LOGGER.warn("Failed to publish SQS job {}", message.type(), exception);
            return false;
        } finally {
            sample.stop(
                Timer.builder("plura.sqs.publish.latency")
                    .description("SQS publish latency")
                    .register(meterRegistry)
            );
        }
    }

    public List<ReceivedJob> poll() {
        if (!isEnabled()) {
            return List.of();
        }
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            ReceiveMessageRequest request = ReceiveMessageRequest.builder()
                .queueUrl(properties.getQueueUrl())
                .waitTimeSeconds(Math.max(1, properties.getWaitTimeSeconds()))
                .maxNumberOfMessages(Math.max(1, Math.min(10, properties.getMaxMessages())))
                .build();
            List<Message> messages = sqsClient.get().receiveMessage(request).messages();
            if (messages == null || messages.isEmpty()) {
                return List.of();
            }
            List<ReceivedJob> result = new ArrayList<>();
            for (Message message : messages) {
                try {
                    QueueJobMessage parsed = objectMapper.readValue(message.body(), QueueJobMessage.class);
                    result.add(new ReceivedJob(parsed, message.receiptHandle()));
                } catch (JsonProcessingException exception) {
                    markError("parse");
                    LOGGER.warn("Invalid SQS payload, sending to DLQ");
                    moveToDlqRaw(message.body(), "INVALID_PAYLOAD");
                    ack(message.receiptHandle());
                }
            }
            return result;
        } catch (Exception exception) {
            markError("poll");
            LOGGER.warn("Failed to poll SQS queue", exception);
            return List.of();
        } finally {
            sample.stop(
                Timer.builder("plura.sqs.consume.latency")
                    .description("SQS consume latency")
                    .register(meterRegistry)
            );
        }
    }

    public void ack(String receiptHandle) {
        if (!isEnabled() || !hasText(receiptHandle)) {
            return;
        }
        try {
            sqsClient.get().deleteMessage(
                DeleteMessageRequest.builder()
                    .queueUrl(properties.getQueueUrl())
                    .receiptHandle(receiptHandle)
                    .build()
            );
        } catch (Exception exception) {
            markError("ack");
            LOGGER.warn("Failed to ack SQS message", exception);
        }
    }

    public void moveToDlq(QueueJobMessage message, String reason) {
        if (message == null) {
            return;
        }
        try {
            String payload = objectMapper.writeValueAsString(new DlqPayload(reason, message));
            moveToDlqRaw(payload, reason);
        } catch (JsonProcessingException exception) {
            markError("dlq_payload");
            LOGGER.warn("Failed to serialize DLQ payload", exception);
        }
    }

    private void moveToDlqRaw(String body, String reason) {
        if (!isEnabled() || !hasText(properties.getDlqUrl())) {
            return;
        }
        try {
            sqsClient.get().sendMessage(
                SendMessageRequest.builder()
                    .queueUrl(properties.getDlqUrl())
                    .messageBody(body)
                    .build()
            );
            Counter.builder("plura.sqs.dlq.count")
                .description("Messages moved to DLQ")
                .tag("reason", reason == null ? "unknown" : reason)
                .register(meterRegistry)
                .increment();
        } catch (Exception exception) {
            markError("dlq");
            LOGGER.warn("Failed to move message to DLQ", exception);
        }
    }

    private void markError(String operation) {
        Counter.builder("plura.sqs.errors")
            .description("SQS errors")
            .tag("operation", operation)
            .register(meterRegistry)
            .increment();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record DlqPayload(String reason, QueueJobMessage message) {}

    public record ReceivedJob(QueueJobMessage message, String receiptHandle) {}
}

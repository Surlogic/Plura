package com.plura.plurabackend.core.jobs;

import java.time.Instant;

public record QueueJobMessage(
    String jobId,
    JobType type,
    String payload,
    Instant createdAt
) {
    public static QueueJobMessage now(String jobId, JobType type, String payload) {
        return new QueueJobMessage(jobId, type, payload, Instant.now());
    }
}

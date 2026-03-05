package com.plura.plurabackend.jobs;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import org.springframework.stereotype.Service;

@Service
public class JobIdempotencyService {

    private final Cache<String, Boolean> processedJobs = Caffeine.newBuilder()
        .maximumSize(100_000)
        .expireAfterWrite(Duration.ofHours(24))
        .build();

    public boolean shouldProcess(String jobId) {
        if (jobId == null || jobId.isBlank()) {
            return true;
        }
        Boolean previous = processedJobs.asMap().putIfAbsent(jobId, Boolean.TRUE);
        return previous == null;
    }
}

package com.plura.plurabackend.core.availability;

import com.plura.plurabackend.config.DistributedLockService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ScheduleSummaryScheduler {

    private static final int LOCK_ID = 100_002;

    private final ScheduleSummaryService scheduleSummaryService;
    private final DistributedLockService distributedLockService;
    private final boolean summaryEnabled;

    public ScheduleSummaryScheduler(
        ScheduleSummaryService scheduleSummaryService,
        DistributedLockService distributedLockService,
        @Value("${feature.availability.summary-enabled:false}") boolean summaryEnabled
    ) {
        this.scheduleSummaryService = scheduleSummaryService;
        this.distributedLockService = distributedLockService;
        this.summaryEnabled = summaryEnabled;
    }

    @Scheduled(cron = "${app.availability.summary-cron:0 */30 * * * *}")
    public void rebuildIncremental() {
        if (!summaryEnabled) {
            return;
        }
        distributedLockService.runWithLock(LOCK_ID, "schedule-summary", () ->
            scheduleSummaryService.rebuildAllIncremental(100)
        );
    }
}

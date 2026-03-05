package com.plura.plurabackend.availability;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ScheduleSummaryScheduler {

    private final ScheduleSummaryService scheduleSummaryService;
    private final boolean summaryEnabled;

    public ScheduleSummaryScheduler(
        ScheduleSummaryService scheduleSummaryService,
        @Value("${feature.availability.summary-enabled:false}") boolean summaryEnabled
    ) {
        this.scheduleSummaryService = scheduleSummaryService;
        this.summaryEnabled = summaryEnabled;
    }

    @Scheduled(cron = "${app.availability.summary-cron:0 */30 * * * *}")
    public void rebuildIncremental() {
        if (!summaryEnabled) {
            return;
        }
        scheduleSummaryService.rebuildAllIncremental(100);
    }
}

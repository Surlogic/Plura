package com.plura.plurabackend.core.search;

import com.plura.plurabackend.config.DistributedLockService;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class SearchMaterializedViewRefreshService implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(SearchMaterializedViewRefreshService.class);
    private static final int LOCK_ID = 100_001;

    private final JdbcTemplate jdbcTemplate;
    private final DistributedLockService distributedLockService;
    private final boolean refreshOnStartup;
    private final boolean scheduledRefreshEnabled;
    private final AtomicBoolean refreshRunning = new AtomicBoolean(false);

    public SearchMaterializedViewRefreshService(
        JdbcTemplate jdbcTemplate,
        DistributedLockService distributedLockService,
        @Value("${app.search.materialized-view.refresh-on-startup:true}") boolean refreshOnStartup,
        @Value("${app.search.materialized-view.refresh-enabled:true}") boolean scheduledRefreshEnabled
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.distributedLockService = distributedLockService;
        this.refreshOnStartup = refreshOnStartup;
        this.scheduledRefreshEnabled = scheduledRefreshEnabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!refreshOnStartup) {
            return;
        }
        Thread refreshThread = new Thread(() -> refresh("startup"), "search-mv-refresh-startup");
        refreshThread.setDaemon(true);
        refreshThread.start();
    }

    @Scheduled(cron = "${app.search.materialized-view.refresh-cron:0 */10 * * * *}")
    public void refreshOnSchedule() {
        if (!scheduledRefreshEnabled) {
            return;
        }
        distributedLockService.runWithLock(LOCK_ID, "mv-refresh", () -> refresh("scheduled"));
    }

    void refresh(String source) {
        if (!refreshRunning.compareAndSet(false, true)) {
            LOGGER.debug("Skipping search materialized view refresh because another refresh is running source={}", source);
            return;
        }

        try {
            jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY search_professional_document_mv");
            jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY search_service_document_mv");
            LOGGER.info("Search materialized views refreshed source={}", source);
        } catch (RuntimeException exception) {
            LOGGER.warn("Search materialized view refresh skipped source={} message={}", source, exception.getMessage());
        } finally {
            refreshRunning.set(false);
        }
    }
}

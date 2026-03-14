package com.plura.plurabackend.core.search.engine;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class SearchReindexRunner implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(SearchReindexRunner.class);

    private final SearchIndexer searchIndexer;
    private final boolean searchEngineEnabled;
    private final boolean reindexOnStartup;

    public SearchReindexRunner(
        SearchIndexer searchIndexer,
        @Value("${app.search-engine.enabled:false}") boolean searchEngineEnabled,
        @Value("${app.search-engine.meili.reindex-on-startup:false}") boolean reindexOnStartup
    ) {
        this.searchIndexer = searchIndexer;
        this.searchEngineEnabled = searchEngineEnabled;
        this.reindexOnStartup = reindexOnStartup;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!searchEngineEnabled || !reindexOnStartup) {
            return;
        }
        LOGGER.info("Starting full search reindex on startup");
        searchIndexer.reindexAll(200);
        LOGGER.info("Full search reindex finished");
    }
}

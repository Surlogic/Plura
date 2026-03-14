package com.plura.plurabackend.core.search.engine;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.Collection;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SearchIndexer {

    private final SearchIndexService searchIndexService;
    private final SearchEngineClient searchEngineClient;
    private final MeterRegistry meterRegistry;
    private final boolean searchEngineEnabled;

    public SearchIndexer(
        SearchIndexService searchIndexService,
        SearchEngineClient searchEngineClient,
        MeterRegistry meterRegistry,
        @Value("${app.search-engine.enabled:false}") boolean searchEngineEnabled
    ) {
        this.searchIndexService = searchIndexService;
        this.searchEngineClient = searchEngineClient;
        this.meterRegistry = meterRegistry;
        this.searchEngineEnabled = searchEngineEnabled;
    }

    public void indexProfessionals(Collection<Long> professionalIds) {
        if (!searchEngineEnabled || professionalIds == null || professionalIds.isEmpty()) {
            return;
        }
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            List<SearchIndexDocument> documents = searchIndexService.buildDocumentsByProfessionalIds(professionalIds);
            searchEngineClient.upsertDocuments(documents);
        } catch (RuntimeException exception) {
            markError("index_professionals");
            throw exception;
        } finally {
            sample.stop(
                Timer.builder("plura.search.indexer.duration")
                    .description("Search indexer duration")
                    .register(meterRegistry)
            );
        }
    }

    public void reindexAll(int batchSize) {
        if (!searchEngineEnabled) {
            return;
        }

        int page = 0;
        int size = Math.max(10, Math.min(500, batchSize));
        while (true) {
            List<SearchIndexDocument> batch = searchIndexService.buildDocumentsPage(page, size);
            if (batch.isEmpty()) {
                break;
            }
            searchEngineClient.upsertDocuments(batch);
            if (batch.size() < size) {
                break;
            }
            page++;
        }
    }

    private void markError(String operation) {
        Counter.builder("plura.search.indexer.errors")
            .description("Search indexer errors")
            .tag("operation", operation)
            .register(meterRegistry)
            .increment();
    }
}

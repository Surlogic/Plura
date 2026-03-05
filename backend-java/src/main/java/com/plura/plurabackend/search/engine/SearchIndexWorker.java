package com.plura.plurabackend.search.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class SearchIndexWorker {

    private final SearchIndexer searchIndexer;
    private final ObjectMapper objectMapper;

    public SearchIndexWorker(SearchIndexer searchIndexer, ObjectMapper objectMapper) {
        this.searchIndexer = searchIndexer;
        this.objectMapper = objectMapper;
    }

    public void handleQueuedSyncPayload(String payload) throws JsonProcessingException {
        SearchSyncPublisher.SearchSyncPayload parsed = objectMapper.readValue(payload, SearchSyncPublisher.SearchSyncPayload.class);
        Set<Long> ids = parsed == null ? Set.of() : parsed.professionalIds();
        searchIndexer.indexProfessionals(ids);
    }
}

package com.plura.plurabackend.core.search.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * SearchIndexWorker es un worker asincronico del modulo busqueda / motor.
 * Responsabilidad: procesar tareas pendientes con control de estado, reintentos o leases.
 * Colabora con: searchIndexer, objectMapper.
 * Foco funcional: busqueda, trabajadores.
 */
@Service
public class SearchIndexWorker {

    private final SearchIndexer searchIndexer;
    private final ObjectMapper objectMapper;

    public SearchIndexWorker(SearchIndexer searchIndexer, ObjectMapper objectMapper) {
        this.searchIndexer = searchIndexer;
        this.objectMapper = objectMapper;
    }

    /**
     * Procesa queued sync payload y coordina la respuesta del flujo.
     */
    public void handleQueuedSyncPayload(String payload) throws JsonProcessingException {
        SearchSyncPublisher.SearchSyncPayload parsed = objectMapper.readValue(payload, SearchSyncPublisher.SearchSyncPayload.class);
        Set<Long> ids = parsed == null ? Set.of() : parsed.professionalIds();
        searchIndexer.indexProfessionals(ids);
    }
}

package com.plura.plurabackend.core.search.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.cache.SearchCacheService;
import com.plura.plurabackend.core.jobs.JobType;
import com.plura.plurabackend.core.jobs.QueueJobMessage;
import com.plura.plurabackend.core.jobs.sqs.SqsJobQueueService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * SearchSyncPublisher es un componente de dominio del modulo busqueda / motor.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Colabora con: sqsJobQueueService, searchIndexer, searchCacheService, objectMapper, entre otros.
 * Foco funcional: busqueda.
 */
@Service
public class SearchSyncPublisher {

    private static final Logger LOGGER = LoggerFactory.getLogger(SearchSyncPublisher.class);

    private final SqsJobQueueService sqsJobQueueService;
    private final SearchIndexer searchIndexer;
    private final SearchCacheService searchCacheService;
    private final ObjectMapper objectMapper;
    private final boolean searchEngineEnabled;
    private final boolean sqsEnabled;
    private final boolean searchIndexSqsEnabled;

    public SearchSyncPublisher(
        SqsJobQueueService sqsJobQueueService,
        SearchIndexer searchIndexer,
        SearchCacheService searchCacheService,
        ObjectMapper objectMapper,
        @Value("${app.search-engine.enabled:false}") boolean searchEngineEnabled,
        @Value("${app.sqs.enabled:false}") boolean sqsEnabled,
        @Value("${jobs.sqs.search-index-enabled:false}") boolean searchIndexSqsEnabled
    ) {
        this.sqsJobQueueService = sqsJobQueueService;
        this.searchIndexer = searchIndexer;
        this.searchCacheService = searchCacheService;
        this.objectMapper = objectMapper;
        this.searchEngineEnabled = searchEngineEnabled;
        this.sqsEnabled = sqsEnabled;
        this.searchIndexSqsEnabled = searchIndexSqsEnabled;
    }

    public void publishProfileChanged(Long professionalId) {
        if (professionalId == null) {
            return;
        }
        publishProfilesChanged(Set.of(professionalId));
    }

    /**
     * Publica perfiles changed para que otros procesos reaccionen al cambio.
     */
    public void publishProfilesChanged(Collection<Long> professionalIds) {
        if (professionalIds == null || professionalIds.isEmpty()) {
            return;
        }

        Set<Long> ids = professionalIds.stream()
            .filter(id -> id != null && id > 0)
            .collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll);
        if (ids.isEmpty()) {
            return;
        }
        searchCacheService.evictAll();
        if (!searchEngineEnabled) {
            return;
        }

        if (sqsEnabled && searchIndexSqsEnabled && sqsJobQueueService.isEnabled()) {
            try {
                SearchSyncPayload payload = new SearchSyncPayload(ids);
                QueueJobMessage job = QueueJobMessage.now(
                    deterministicJobId(ids),
                    JobType.SEARCH_INDEX_SYNC,
                    objectMapper.writeValueAsString(payload)
                );
                if (sqsJobQueueService.publish(job)) {
                    return;
                }
            } catch (JsonProcessingException exception) {
                LOGGER.warn("Failed to serialize search index sync payload, fallback to local", exception);
            }
        }

        try {
            searchIndexer.indexProfessionals(ids);
        } catch (RuntimeException exception) {
            LOGGER.warn("Search indexing failed for profiles {}, keeping write path alive", ids, exception);
        }
    }

    /**
     * Genera job ID deterministico para idempotencia o deduplicacion.
     */
    private String deterministicJobId(Set<Long> ids) {
        String raw = ids.stream().sorted().map(String::valueOf).reduce((left, right) -> left + "," + right).orElse("none");
        return "search-index:" + sha256(raw);
    }

    /**
     * Calcula hash SHA para generar identificadores estables o seguros.
     */
    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte b : bytes) {
                result.append(String.format("%02x", b));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    /**
     * Bloque de datos search sync payload dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record SearchSyncPayload(Set<Long> professionalIds) {}
}

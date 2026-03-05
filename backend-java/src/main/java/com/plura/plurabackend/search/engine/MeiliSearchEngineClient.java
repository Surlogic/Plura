package com.plura.plurabackend.search.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.search.SearchQueryCriteria;
import com.plura.plurabackend.search.SearchSuggestCriteria;
import com.plura.plurabackend.search.dto.SearchSuggestCategoryResponse;
import com.plura.plurabackend.search.dto.SearchSuggestItemResponse;
import com.plura.plurabackend.search.dto.SearchSuggestResponse;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnExpression("'${app.search-engine.provider:MEILI}'.equalsIgnoreCase('MEILI')")
public class MeiliSearchEngineClient implements SearchEngineClient {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final String host;
    private final String apiKey;
    private final String indexName;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final HttpClient httpClient;
    private final AtomicBoolean ensuredIndex = new AtomicBoolean(false);

    public MeiliSearchEngineClient(
        @Value("${app.search-engine.meili.host:http://localhost:7700}") String host,
        @Value("${app.search-engine.meili.api-key:}") String apiKey,
        @Value("${app.search-engine.meili.index-name:professional_profile}") String indexName,
        @Value("${app.search-engine.meili.timeout-millis:2000}") long timeoutMillis,
        ObjectMapper objectMapper,
        MeterRegistry meterRegistry
    ) {
        this.host = normalizeHost(host);
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.indexName = indexName == null || indexName.isBlank() ? "professional_profile" : indexName.trim();
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(Math.max(500L, timeoutMillis)))
            .build();
    }

    @Override
    public SearchEngineSearchResult search(SearchQueryCriteria criteria) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            ensureIndexExists();
            List<String> filters = new ArrayList<>();
            if (criteria.categorySlug() != null && !criteria.categorySlug().isBlank()) {
                filters.add("categories = '" + escapeFilter(criteria.categorySlug()) + "'");
            }
            if (criteria.availableNow() || (criteria.dateFrom() != null && criteria.dateTo() != null)) {
                filters.add("hasAvailabilityToday = true");
            }

            Map<String, Object> body = Map.of(
                "q", criteria.query() == null ? "" : criteria.query(),
                "offset", criteria.offset(),
                "limit", criteria.size(),
                "attributesToRetrieve", List.of("id"),
                "filter", filters
            );
            Map<String, Object> response = postJson("/indexes/" + indexName + "/search", body);

            List<Long> orderedIds = readHitsIds(response.get("hits"));
            long total = readLong(response.get("estimatedTotalHits"));
            return new SearchEngineSearchResult(orderedIds, total);
        } finally {
            sample.stop(
                Timer.builder("plura.search.engine.latency")
                    .description("Search engine latency")
                    .tag("operation", "search")
                    .register(meterRegistry)
            );
        }
    }

    @Override
    public SearchSuggestResponse suggest(SearchSuggestCriteria criteria) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            ensureIndexExists();
            Map<String, Object> body = Map.of(
                "q", criteria.query() == null ? "" : criteria.query(),
                "offset", 0,
                "limit", Math.max(10, criteria.limit() * 6),
                "attributesToRetrieve", List.of("id", "displayName", "locationText", "categories", "services")
            );
            Map<String, Object> response = postJson("/indexes/" + indexName + "/search", body);

            List<Map<String, Object>> hits = toHitMaps(response.get("hits"));
            int limit = Math.max(1, criteria.limit());

            Set<String> categories = new LinkedHashSet<>();
            Set<String> services = new LinkedHashSet<>();
            List<SearchSuggestItemResponse> professionals = new ArrayList<>();
            List<SearchSuggestItemResponse> locals = new ArrayList<>();

            for (Map<String, Object> hit : hits) {
                Long id = toLong(hit.get("id"));
                String displayName = safeString(hit.get("displayName"));
                String localName = safeString(hit.get("locationText"));
                readStringList(hit.get("categories")).forEach(categories::add);
                readStringList(hit.get("services")).forEach(services::add);
                if (id != null && !displayName.isBlank() && professionals.size() < limit) {
                    professionals.add(new SearchSuggestItemResponse(String.valueOf(id), displayName));
                }
                if (id != null && !localName.isBlank() && locals.size() < limit) {
                    locals.add(new SearchSuggestItemResponse(String.valueOf(id), localName));
                }
            }

            List<SearchSuggestCategoryResponse> categoryResponses = categories.stream()
                .limit(limit)
                .map(name -> new SearchSuggestCategoryResponse(name, slugify(name)))
                .collect(Collectors.toList());
            List<SearchSuggestItemResponse> serviceResponses = services.stream()
                .limit(limit)
                .map(name -> new SearchSuggestItemResponse(null, name))
                .collect(Collectors.toList());

            return new SearchSuggestResponse(
                categoryResponses,
                serviceResponses,
                professionals,
                locals,
                List.of()
            );
        } finally {
            sample.stop(
                Timer.builder("plura.search.engine.latency")
                    .description("Search engine latency")
                    .tag("operation", "suggest")
                    .register(meterRegistry)
            );
        }
    }

    @Override
    public void upsertDocuments(List<SearchIndexDocument> documents) {
        if (documents == null || documents.isEmpty()) {
            return;
        }
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            ensureIndexExists();
            postJson("/indexes/" + indexName + "/documents", documents);
        } finally {
            sample.stop(
                Timer.builder("plura.search.engine.latency")
                    .description("Search engine latency")
                    .tag("operation", "upsert")
                    .register(meterRegistry)
            );
        }
    }

    private void ensureIndexExists() {
        if (ensuredIndex.get()) {
            return;
        }
        try {
            postJson("/indexes", Map.of("uid", indexName, "primaryKey", "id"));
        } catch (RuntimeException ignored) {
            // Index likely already exists; continue to allow idempotent boot.
        }
        ensuredIndex.set(true);
    }

    private Map<String, Object> postJson(String path, Object payload) {
        try {
            String body = objectMapper.writeValueAsString(payload);
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(host + path))
                .timeout(Duration.ofSeconds(5))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));

            if (!apiKey.isBlank()) {
                requestBuilder.header("Authorization", "Bearer " + apiKey);
            }

            HttpResponse<String> response = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status < 200 || status >= 300) {
                markError("http_" + status);
                throw new IllegalStateException("Meilisearch request failed with status " + status);
            }
            String responseBody = response.body();
            if (responseBody == null || responseBody.isBlank()) {
                return Map.of();
            }
            return objectMapper.readValue(responseBody, MAP_TYPE);
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            markError("io");
            throw new IllegalStateException("Meilisearch request failed", exception);
        }
    }

    private List<Long> readHitsIds(Object hitsRaw) {
        List<Map<String, Object>> hits = toHitMaps(hitsRaw);
        List<Long> ids = new ArrayList<>();
        for (Map<String, Object> hit : hits) {
            Long id = toLong(hit.get("id"));
            if (id != null) {
                ids.add(id);
            }
        }
        return ids;
    }

    private List<Map<String, Object>> toHitMaps(Object hitsRaw) {
        if (!(hitsRaw instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> hits = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                Map<String, Object> hit = map.entrySet().stream()
                    .filter(entry -> entry.getKey() != null)
                    .collect(Collectors.toMap(entry -> String.valueOf(entry.getKey()), Map.Entry::getValue));
                hits.add(hit);
            }
        }
        return hits;
    }

    private String safeString(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private List<String> readStringList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
            .filter(Objects::nonNull)
            .map(String::valueOf)
            .map(String::trim)
            .filter(item -> !item.isBlank())
            .toList();
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.valueOf(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private long readLong(Object value) {
        Long parsed = toLong(value);
        return parsed == null ? 0L : parsed;
    }

    private String escapeFilter(String raw) {
        return raw.replace("'", "\\'");
    }

    private String slugify(String value) {
        return value.toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-+|-+$)", "");
    }

    private String normalizeHost(String rawHost) {
        String value = rawHost == null || rawHost.isBlank() ? "http://localhost:7700" : rawHost.trim();
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private void markError(String reason) {
        Counter.builder("plura.search.engine.errors")
            .description("Search engine errors")
            .tag("reason", reason)
            .register(meterRegistry)
            .increment();
    }
}

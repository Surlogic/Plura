package com.plura.plurabackend.core.search;

import com.plura.plurabackend.core.cache.SearchCacheService;
import com.plura.plurabackend.core.search.dto.SearchItemResponse;
import com.plura.plurabackend.core.search.dto.SearchResponse;
import com.plura.plurabackend.core.search.dto.SearchSort;
import com.plura.plurabackend.core.search.dto.SearchSuggestResponse;
import com.plura.plurabackend.core.search.dto.SearchType;
import com.plura.plurabackend.core.search.engine.SearchEngineClient;
import com.plura.plurabackend.core.search.engine.SearchEngineSearchResult;
import com.plura.plurabackend.core.storage.ImageStorageService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SearchService {

    private static final Logger LOGGER = LoggerFactory.getLogger(SearchService.class);
    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 24;
    private static final int MAX_SIZE = 60;
    private static final int DEFAULT_SUGGEST_LIMIT = 6;
    private static final int MAX_SUGGEST_LIMIT = 10;
    private static final double DEFAULT_RADIUS_KM = 10d;

    private final SearchNativeRepository searchNativeRepository;
    private final SearchCacheService searchCacheService;
    private final MeterRegistry meterRegistry;
    private final Optional<SearchEngineClient> searchEngineClient;
    private final ImageStorageService imageStorageService;
    private final boolean searchNoCountModeEnabled;
    private final String searchAvailabilitySource;
    private final boolean nextAvailableAtEnabled;
    private final boolean searchEngineEnabled;
    private final boolean searchEngineSuggestEnabled;
    private final boolean searchEngineHydrateFromDb;
    private final AtomicBoolean searchEngineSearchWarned = new AtomicBoolean(false);
    private final AtomicBoolean searchEngineSuggestWarned = new AtomicBoolean(false);

    public SearchService(
        SearchNativeRepository searchNativeRepository,
        SearchCacheService searchCacheService,
        MeterRegistry meterRegistry,
        Optional<SearchEngineClient> searchEngineClient,
        ImageStorageService imageStorageService,
        @Value("${feature.search.no-count-mode-enabled:false}") boolean searchNoCountModeEnabled,
        @Value("${feature.search.availability-source:AVAILABLE_SLOT}") String searchAvailabilitySource,
        @Value("${feature.availability.next-available-at-enabled:false}") boolean nextAvailableAtEnabled,
        @Value("${app.search-engine.enabled:false}") boolean searchEngineEnabled,
        @Value("${app.search-engine.suggest-enabled:false}") boolean searchEngineSuggestEnabled,
        @Value("${app.search-engine.hydrate-from-db:true}") boolean searchEngineHydrateFromDb
    ) {
        this.searchNativeRepository = searchNativeRepository;
        this.searchCacheService = searchCacheService;
        this.meterRegistry = meterRegistry;
        this.searchEngineClient = searchEngineClient;
        this.imageStorageService = imageStorageService;
        this.searchNoCountModeEnabled = searchNoCountModeEnabled;
        this.searchAvailabilitySource = searchAvailabilitySource;
        this.nextAvailableAtEnabled = nextAvailableAtEnabled;
        this.searchEngineEnabled = searchEngineEnabled;
        this.searchEngineSuggestEnabled = searchEngineSuggestEnabled;
        this.searchEngineHydrateFromDb = searchEngineHydrateFromDb;
    }

    public SearchResponse search(
        String rawQuery,
        String rawType,
        String rawCategorySlug,
        Double lat,
        Double lng,
        Double rawRadiusKm,
        String rawCity,
        LocalDate date,
        LocalDate from,
        LocalDate to,
        boolean availableNow,
        Integer rawPage,
        Integer rawSize,
        String rawSort
    ) {
        SearchType type;
        SearchSort sort;
        try {
            type = SearchType.fromRaw(rawType);
            if (type == null) {
                type = SearchType.SERVICIO;
            }
            sort = SearchSort.fromRaw(rawSort);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parámetros de búsqueda inválidos");
        }

        int page = rawPage == null ? DEFAULT_PAGE : rawPage;
        int size = rawSize == null ? DEFAULT_SIZE : rawSize;
        if (page < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page debe ser mayor o igual a 0");
        }
        if (size <= 0 || size > MAX_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "size debe estar entre 1 y " + MAX_SIZE);
        }

        if ((lat == null) != (lng == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lat y lng deben enviarse juntos");
        }

        double radiusKm = rawRadiusKm == null ? DEFAULT_RADIUS_KM : rawRadiusKm;
        if (radiusKm <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "radiusKm debe ser mayor a 0");
        }

        LocalDate rangeStart = date;
        LocalDate rangeEnd = date;
        if (rangeStart == null && from != null && to != null) {
            if (to.isBefore(from)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "to debe ser mayor o igual a from");
            }
            rangeStart = from;
            rangeEnd = to;
        }
        if ((from != null && to == null) || (from == null && to != null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from y to deben enviarse juntos");
        }

        SearchQueryCriteria criteria = new SearchQueryCriteria(
            type,
            rawQuery,
            rawCategorySlug,
            lat,
            lng,
            radiusKm,
            rawCity,
            rangeStart,
            rangeEnd,
            availableNow,
            page,
            size,
            sort
        );

        String cacheKey = buildSearchCacheKey(criteria);
        var cachedResponse = searchCacheService.getSearch(cacheKey);
        if (cachedResponse.isPresent()) {
            return cachedResponse.get();
        }

        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            SearchResponse response = searchWithBestEffort(criteria);
            searchCacheService.putSearch(cacheKey, response);
            return response;
        } finally {
            sample.stop(
                Timer.builder("plura.search.latency")
                    .description("Search request latency")
                    .publishPercentileHistogram()
                    .register(meterRegistry)
            );
        }
    }

    public SearchSuggestResponse suggest(
        String rawQuery,
        Double lat,
        Double lng,
        String rawCity,
        Double rawRadiusKm,
        Integer rawLimit
    ) {
        if ((lat == null) != (lng == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lat y lng deben enviarse juntos");
        }

        int limit = rawLimit == null ? DEFAULT_SUGGEST_LIMIT : rawLimit;
        if (limit <= 0 || limit > MAX_SUGGEST_LIMIT) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "limit debe estar entre 1 y " + MAX_SUGGEST_LIMIT
            );
        }

        double radiusKm = rawRadiusKm == null ? DEFAULT_RADIUS_KM : rawRadiusKm;
        if (radiusKm <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "radiusKm debe ser mayor a 0");
        }

        SearchSuggestCriteria criteria = new SearchSuggestCriteria(
            rawQuery,
            lat,
            lng,
            rawCity,
            radiusKm,
            limit
        );
        String cacheKey = buildSuggestCacheKey(criteria);
        var cachedResponse = searchCacheService.getSuggest(cacheKey);
        if (cachedResponse.isPresent()) {
            return cachedResponse.get();
        }

        SearchSuggestResponse response = suggestWithBestEffort(criteria);
        searchCacheService.putSuggest(cacheKey, response);
        return response;
    }

    private SearchResponse searchWithBestEffort(SearchQueryCriteria criteria) {
        Timer.Sample querySample = Timer.start(meterRegistry);
        try {
            if (searchEngineEnabled && searchEngineClient.isPresent() && !shouldForceSqlSearch(criteria)) {
                try {
                    SearchResponse engineResponse = searchUsingSearchEngine(criteria, searchEngineClient.get());
                    if (engineResponse != null) {
                        return engineResponse;
                    }
                } catch (RuntimeException exception) {
                    logSearchEngineFallback(exception, true);
                }
            }

            SearchNativeRepository.SearchPageResult pageResult = searchNativeRepository.search(
                criteria,
                searchNoCountModeEnabled,
                searchAvailabilitySource,
                nextAvailableAtEnabled
            );
            List<SearchItemResponse> resolved = resolveCoverImageUrls(pageResult.items());
            return new SearchResponse(criteria.page(), criteria.size(), pageResult.total(), resolved);
        } finally {
            querySample.stop(
                Timer.builder("plura.search.query.duration")
                    .description("Search query duration")
                    .publishPercentileHistogram()
                    .register(meterRegistry)
            );
        }
    }

    private SearchResponse searchUsingSearchEngine(SearchQueryCriteria criteria, SearchEngineClient client) {
        SearchEngineSearchResult result = client.search(criteria);
        List<Long> ids = result.orderedIds();
        if (ids.isEmpty()) {
            return new SearchResponse(criteria.page(), criteria.size(), result.total(), List.of());
        }

        List<SearchItemResponse> items;
        if (searchEngineHydrateFromDb) {
            items = searchNativeRepository.hydrateByIdsOrdered(ids, criteria);
        } else {
            items = ids.stream()
                .map(id -> new SearchItemResponse(
                    String.valueOf(id),
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    List.of(),
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
                ))
                .collect(Collectors.toList());
        }

        List<SearchItemResponse> resolved = resolveCoverImageUrls(items);
        return new SearchResponse(criteria.page(), criteria.size(), result.total(), resolved);
    }

    private SearchSuggestResponse suggestWithBestEffort(SearchSuggestCriteria criteria) {
        if (searchEngineEnabled && searchEngineSuggestEnabled && searchEngineClient.isPresent()) {
            try {
                return searchEngineClient.get().suggest(criteria);
            } catch (RuntimeException exception) {
                logSearchEngineFallback(exception, false);
            }
        }
        return searchNativeRepository.suggest(criteria);
    }

    private List<SearchItemResponse> resolveCoverImageUrls(List<SearchItemResponse> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        return items.stream()
            .map(item -> new SearchItemResponse(
                item.getId(),
                item.getSlug(),
                item.getName(),
                item.getProfessionalName(),
                item.getBusinessName(),
                item.getResultKind(),
                item.getHeadline(),
                item.getRating(),
                item.getReviewsCount(),
                item.getCategorySlugs(),
                item.getDistanceKm(),
                item.getLatitude(),
                item.getLongitude(),
                item.getPriceFrom(),
                imageStorageService.resolvePublicUrl(item.getCoverImageUrl()),
                imageStorageService.resolvePublicUrl(item.getBannerUrl()),
                item.getBannerMedia(),
                imageStorageService.resolvePublicUrl(item.getLogoUrl()),
                item.getLogoMedia(),
                imageStorageService.resolvePublicUrl(item.getFallbackPhotoUrl()),
                item.getLocationText()
            ))
            .toList();
    }

    private String buildSearchCacheKey(SearchQueryCriteria criteria) {
        String coordinates = (criteria.lat() != null && criteria.lng() != null)
            ? formatDoubleKey(criteria.lat()) + "," + formatDoubleKey(criteria.lng())
            : "_";
        String location = (criteria.lat() != null && criteria.lng() != null)
            ? coordinates
            : valueOf(criteria.city());
        String date = criteria.dateFrom() == null
            ? ""
            : criteria.dateFrom() + (criteria.dateTo() == null || criteria.dateTo().equals(criteria.dateFrom())
                ? ""
                : "_" + criteria.dateTo());
        return "search:"
            + "type=" + criteria.type().name() + ":"
            + normalizeKeySegment(criteria.query()) + ":"
            + normalizeKeySegment(location) + ":"
            + "radius=" + formatDoubleKey(criteria.radiusKm()) + ":"
            + normalizeKeySegment(criteria.categorySlug()) + ":"
            + normalizeKeySegment(date) + ":"
            + "availableNow=" + criteria.availableNow() + ":"
            + "sort=" + criteria.sort().name() + ":"
            + criteria.page() + ":"
            + criteria.size();
    }

    private String buildSuggestCacheKey(SearchSuggestCriteria criteria) {
        String coordinates = criteria.hasCoordinates()
            ? formatDoubleKey(criteria.lat()) + "," + formatDoubleKey(criteria.lng())
            : "_";
        return "suggest:"
            + normalizeKeySegment(criteria.query()) + ":"
            + "coords=" + normalizeKeySegment(coordinates) + ":"
            + "city=" + normalizeKeySegment(criteria.city()) + ":"
            + "radius=" + formatDoubleKey(criteria.radiusKm()) + ":"
            + "limit=" + criteria.limit();
    }

    private String valueOf(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String normalizeKeySegment(Object value) {
        String raw = valueOf(value).trim().toLowerCase(Locale.ROOT);
        if (raw.isBlank()) {
            return "_";
        }
        return raw.replace(":", "_");
    }

    private String formatDoubleKey(Double value) {
        if (value == null || !Double.isFinite(value)) {
            return "_";
        }
        return String.format(Locale.ROOT, "%.5f", value);
    }

    private void logSearchEngineFallback(RuntimeException exception, boolean searchOperation) {
        AtomicBoolean warned = searchOperation ? searchEngineSearchWarned : searchEngineSuggestWarned;
        String operation = searchOperation ? "search" : "suggest";
        if (warned.compareAndSet(false, true)) {
            LOGGER.warn("Search engine unavailable in {}, fallback to SQL", operation, exception);
            return;
        }
        LOGGER.debug("Search engine unavailable in {}, fallback to SQL", operation, exception);
    }

    private boolean shouldForceSqlSearch(SearchQueryCriteria criteria) {
        if (criteria == null) {
            return false;
        }
        return criteria.categorySlug() != null && !criteria.categorySlug().isBlank();
    }
}

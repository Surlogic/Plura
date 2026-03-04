package com.plura.plurabackend.search;

import com.plura.plurabackend.search.dto.SearchResponse;
import com.plura.plurabackend.search.dto.SearchSort;
import com.plura.plurabackend.search.dto.SearchSuggestResponse;
import com.plura.plurabackend.search.dto.SearchType;
import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    public SearchService(SearchNativeRepository searchNativeRepository) {
        this.searchNativeRepository = searchNativeRepository;
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

        LOGGER.info(
            "[TEMP SEARCH DEBUG] SEARCH PARAMS: type={}, query='{}', categorySlug='{}', city='{}', date={}, from={}, to={}, availableNow={}, page={}, size={}, sort={}",
            type,
            rawQuery,
            rawCategorySlug,
            rawCity,
            date,
            from,
            to,
            availableNow,
            page,
            size,
            sort
        );

        SearchNativeRepository.SearchPageResult pageResult;
        try {
            pageResult = searchNativeRepository.search(criteria);
        } catch (RuntimeException exception) {
            LOGGER.error(
                "[TEMP SEARCH DEBUG] SEARCH ERROR: type={}, query='{}', categorySlug='{}', city='{}', date={}, from={}, to={}, availableNow={}",
                type,
                rawQuery,
                rawCategorySlug,
                rawCity,
                date,
                from,
                to,
                availableNow,
                exception
            );
            throw exception;
        }
        LOGGER.info(
            "[TEMP SEARCH DEBUG] RESULT COUNT: total={}, items={}",
            pageResult.total(),
            pageResult.items().size()
        );
        return new SearchResponse(page, size, pageResult.total(), pageResult.items());
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
        return searchNativeRepository.suggest(criteria);
    }
}

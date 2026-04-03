package com.plura.plurabackend.core.search;

import com.plura.plurabackend.core.common.util.SlugUtils;
import com.plura.plurabackend.core.search.dto.SearchItemResponse;
import com.plura.plurabackend.core.search.dto.SearchSort;
import com.plura.plurabackend.core.search.dto.SearchSuggestCategoryResponse;
import com.plura.plurabackend.core.search.dto.SearchSuggestItemResponse;
import com.plura.plurabackend.core.search.dto.SearchSuggestResponse;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SearchNativeRepository {

    private static final double QUERY_SIMILARITY_THRESHOLD = 0.08d;
    private static final int MAX_CATEGORY_SUGGESTIONS = 15;
    private static final int MAX_POPULAR_NEARBY = 6;
    private static final String PROFESSIONAL_DOCUMENT_VIEW = "search_professional_document_mv";
    private static final String SERVICE_DOCUMENT_VIEW = "search_service_document_mv";

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public SearchNativeRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public SearchPageResult search(
        SearchQueryCriteria criteria,
        boolean searchNoCountModeEnabled,
        String availabilitySource,
        boolean nextAvailableAtEnabled
    ) {
        boolean shouldAttemptFirstPageCountBypass = !searchNoCountModeEnabled && criteria.page() == 0;
        MapSqlParameterSource params = buildParams(criteria);
        String dateMatchExpression = buildDateMatchExpression("doc", availabilitySource, nextAvailableAtEnabled);
        String availableNowMatchExpression = buildAvailableNowMatchExpression("doc", availabilitySource);
        String baseWhereClause = buildSearchWhereClause(dateMatchExpression, availableNowMatchExpression);
        String countSql = "SELECT COUNT(*) FROM " + PROFESSIONAL_DOCUMENT_VIEW + " doc " + baseWhereClause;

        String selectSql =
            "SELECT "
                + "doc.professional_id::text AS id, "
                + "doc.slug AS slug, "
                + "doc.display_name AS name, "
                + "doc.public_headline AS headline, "
                + "doc.rating AS rating, "
                + "doc.reviews_count AS reviews_count, "
                + "doc.location_text AS location_text, "
                + "doc.latitude AS latitude, "
                + "doc.longitude AS longitude, "
                + "doc.price_from AS price_from, "
                + "COALESCE(doc.category_slugs, ARRAY[]::text[]) AS category_slugs, "
                + "doc.cover_image_url AS cover_image_url, "
                + "doc.banner_url AS banner_url, "
                + "doc.banner_position_x AS banner_position_x, "
                + "doc.banner_position_y AS banner_position_y, "
                + "doc.banner_zoom AS banner_zoom, "
                + "doc.logo_url AS logo_url, "
                + "doc.logo_position_x AS logo_position_x, "
                + "doc.logo_position_y AS logo_position_y, "
                + "doc.logo_zoom AS logo_zoom, "
                + "doc.fallback_photo_url AS fallback_photo_url, "
                + buildDistanceExpression("doc") + " AS distance_km, "
                + "CASE WHEN :dateFilter = true AND " + dateMatchExpression + " THEN 1 ELSE 0 END AS date_match, "
                + "CASE WHEN :availableNow = true AND " + availableNowMatchExpression + " THEN 1 ELSE 0 END AS available_now_match, "
                + "CASE "
                + "  WHEN :queryBlank = true THEN 0.0 "
                + "  ELSE GREATEST("
                + "    similarity(doc.name_normalized, :queryNormalized), "
                + "    similarity(doc.headline_normalized, :queryNormalized), "
                + "    similarity(doc.rubro_normalized, :queryNormalized), "
                + "    similarity(doc.category_names_normalized, :queryNormalized), "
                + "    similarity(doc.service_names_normalized, :queryNormalized), "
                + "    similarity(doc.service_category_names_normalized, :queryNormalized), "
                + "    COALESCE(ts_rank_cd(doc.search_vector, plainto_tsquery('simple', :queryTs)), 0.0)"
                + "  ) "
                + "END AS relevance "
                + "FROM " + PROFESSIONAL_DOCUMENT_VIEW + " doc "
                + baseWhereClause
                + buildSortClause(criteria)
                + (
                    searchNoCountModeEnabled || shouldAttemptFirstPageCountBypass
                        ? " LIMIT :limitPlusOne OFFSET :offset"
                        : " LIMIT :limit OFFSET :offset"
                );

        if (!searchNoCountModeEnabled) {
            List<SearchItemResponse> items = jdbcTemplate.query(selectSql, params, SEARCH_ROW_MAPPER);
            if (shouldAttemptFirstPageCountBypass) {
                if (items.size() <= criteria.size()) {
                    return new SearchPageResult((long) items.size(), items, false);
                }
                items = items.subList(0, criteria.size());
            }
            Long total = jdbcTemplate.queryForObject(countSql, params, Long.class);
            return new SearchPageResult(total == null ? 0L : total, items, false);
        }

        List<SearchItemResponse> rows = jdbcTemplate.query(selectSql, params, SEARCH_ROW_MAPPER);
        boolean hasNext = rows.size() > criteria.size();
        List<SearchItemResponse> items = hasNext ? rows.subList(0, criteria.size()) : rows;
        long totalEstimate = hasNext
            ? criteria.offset() + items.size() + 1L
            : criteria.offset() + items.size();
        return new SearchPageResult(totalEstimate, items, hasNext);
    }

    public SearchSuggestResponse suggest(SearchSuggestCriteria criteria) {
        MapSqlParameterSource params = buildSuggestParams(criteria);
        String professionalLocationClause = buildLocationClause("doc");
        String serviceLocationClause = buildLocationClause("svc");

        String categoriesSql =
            "SELECT c.name, c.slug "
                + "FROM categories c "
                + "WHERE c.active = true "
                + "AND (:queryBlank = true OR ("
                + "  immutable_unaccent(lower(c.name)) % :queryNormalized "
                + "  OR immutable_unaccent(lower(c.slug)) % :querySlug "
                + "  OR immutable_unaccent(lower(c.name)) LIKE :queryLike"
                + ")) "
                + "ORDER BY "
                + "CASE WHEN :queryBlank = true THEN COALESCE(c.display_order, 9999)::double precision ELSE NULL END ASC NULLS LAST, "
                + "CASE WHEN :queryBlank = false THEN GREATEST("
                + "  similarity(immutable_unaccent(lower(c.name)), :queryNormalized), "
                + "  similarity(immutable_unaccent(lower(c.slug)), :querySlug)"
                + ") ELSE NULL END DESC NULLS LAST, "
                + "COALESCE(c.display_order, 9999) ASC, c.name ASC "
                + "LIMIT :categoryLimit";

        String servicesSql =
            "SELECT NULL::text AS id, svc.service_name AS name "
                + "FROM " + SERVICE_DOCUMENT_VIEW + " svc "
                + "WHERE 1 = 1 "
                + serviceLocationClause
                + "AND (:queryBlank = true OR ("
                + "  svc.service_name_normalized % :queryNormalized "
                + "  OR svc.service_name_normalized LIKE :queryLike "
                + "  OR svc.search_vector @@ plainto_tsquery('simple', :queryTs)"
                + ")) "
                + "GROUP BY svc.service_name "
                + "ORDER BY "
                + "CASE WHEN :queryBlank = false THEN MAX(GREATEST("
                + "  similarity(svc.service_name_normalized, :queryNormalized), "
                + "  COALESCE(ts_rank_cd(svc.search_vector, plainto_tsquery('simple', :queryTs)), 0.0)"
                + ")) ELSE NULL END DESC NULLS LAST, "
                + "COUNT(*) DESC, svc.service_name ASC "
                + "LIMIT :limit";

        String profilesSql =
            "SELECT "
                + "doc.professional_id::text AS id, "
                + "doc.display_name AS full_name, "
                + "COALESCE(NULLIF(doc.public_headline, ''), doc.display_name) AS local_name, "
                + "doc.rating AS rating, "
                + "doc.reviews_count AS reviews_count, "
                + "GREATEST("
                + "  similarity(doc.name_normalized, :queryNormalized), "
                + "  similarity(doc.headline_normalized, :queryNormalized), "
                + "  COALESCE(ts_rank_cd(doc.search_vector, plainto_tsquery('simple', :queryTs)), 0.0)"
                + ") AS professional_score, "
                + "GREATEST("
                + "  similarity(doc.headline_normalized, :queryNormalized), "
                + "  similarity(doc.name_normalized, :queryNormalized), "
                + "  similarity(doc.location_text_normalized, :queryNormalized), "
                + "  COALESCE(ts_rank_cd(doc.search_vector, plainto_tsquery('simple', :queryTs)), 0.0)"
                + ") AS local_score "
                + "FROM " + PROFESSIONAL_DOCUMENT_VIEW + " doc "
                + "WHERE 1 = 1 "
                + professionalLocationClause
                + "AND (:queryBlank = true OR ("
                + "  doc.name_normalized % :queryNormalized "
                + "  OR doc.headline_normalized % :queryNormalized "
                + "  OR doc.location_text_normalized % :queryNormalized "
                + "  OR doc.name_normalized LIKE :queryLike "
                + "  OR doc.headline_normalized LIKE :queryLike "
                + "  OR doc.location_text_normalized LIKE :queryLike "
                + "  OR doc.search_vector @@ plainto_tsquery('simple', :queryTs)"
                + ")) "
                + "ORDER BY doc.rating DESC, doc.reviews_count DESC, full_name ASC "
                + "LIMIT :profilePoolLimit";

        int limit = Math.max(1, Math.min(criteria.limit(), 10));

        List<SearchSuggestCategoryResponse> categories = jdbcTemplate.query(
            categoriesSql,
            params,
            (rs, rowNum) -> new SearchSuggestCategoryResponse(rs.getString("name"), rs.getString("slug"))
        );
        List<SearchSuggestItemResponse> services = jdbcTemplate.query(
            servicesSql,
            params,
            SEARCH_SUGGEST_ITEM_ROW_MAPPER
        );
        List<SuggestProfileCandidate> profilePool = jdbcTemplate.query(
            profilesSql,
            params,
            (rs, rowNum) -> new SuggestProfileCandidate(
                rs.getString("id"),
                rs.getString("full_name"),
                rs.getString("local_name"),
                rs.getDouble("rating"),
                rs.getInt("reviews_count"),
                rs.getDouble("professional_score"),
                rs.getDouble("local_score")
            )
        );

        Comparator<SuggestProfileCandidate> professionalOrder = Comparator
            .comparingDouble(SuggestProfileCandidate::professionalScore).reversed()
            .thenComparing(Comparator.comparingDouble(SuggestProfileCandidate::rating).reversed())
            .thenComparing(Comparator.comparingInt(SuggestProfileCandidate::reviewsCount).reversed())
            .thenComparing(SuggestProfileCandidate::fullName);

        Comparator<SuggestProfileCandidate> localOrder = Comparator
            .comparingDouble(SuggestProfileCandidate::localScore).reversed()
            .thenComparing(Comparator.comparingDouble(SuggestProfileCandidate::rating).reversed())
            .thenComparing(Comparator.comparingInt(SuggestProfileCandidate::reviewsCount).reversed())
            .thenComparing(SuggestProfileCandidate::localName);

        Comparator<SuggestProfileCandidate> nearbyOrder = Comparator
            .comparingDouble(SuggestProfileCandidate::rating).reversed()
            .thenComparing(Comparator.comparingInt(SuggestProfileCandidate::reviewsCount).reversed())
            .thenComparing(SuggestProfileCandidate::localName);

        List<SearchSuggestItemResponse> professionals = profilePool.stream()
            .sorted(professionalOrder)
            .limit(limit)
            .map(candidate -> new SearchSuggestItemResponse(candidate.id(), candidate.fullName()))
            .collect(Collectors.toList());

        List<SearchSuggestItemResponse> locals = profilePool.stream()
            .sorted(localOrder)
            .limit(limit)
            .map(candidate -> new SearchSuggestItemResponse(candidate.id(), candidate.localName()))
            .collect(Collectors.toList());

        List<SearchSuggestItemResponse> popularNearby = criteria.hasLocationFilter()
            ? profilePool.stream()
                .sorted(nearbyOrder)
                .limit(MAX_POPULAR_NEARBY)
                .map(candidate -> new SearchSuggestItemResponse(candidate.id(), candidate.localName()))
                .collect(Collectors.toList())
            : List.of();

        return new SearchSuggestResponse(categories, services, professionals, locals, popularNearby);
    }

    public List<SearchItemResponse> hydrateByIdsOrdered(List<Long> professionalIds, SearchQueryCriteria criteria) {
        if (professionalIds == null || professionalIds.isEmpty()) {
            return List.of();
        }

        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("ids", professionalIds);
        params.addValue("hasCoords", criteria.hasCoordinates());
        params.addValue("lat", criteria.lat());
        params.addValue("lng", criteria.lng());

        String sql =
            "SELECT "
                + "doc.professional_id::text AS id, "
                + "doc.slug AS slug, "
                + "doc.display_name AS name, "
                + "doc.public_headline AS headline, "
                + "doc.rating AS rating, "
                + "doc.reviews_count AS reviews_count, "
                + "COALESCE(doc.category_slugs, ARRAY[]::text[]) AS category_slugs, "
                + buildDistanceExpression("doc") + " AS distance_km, "
                + "doc.latitude AS latitude, "
                + "doc.longitude AS longitude, "
                + "doc.price_from AS price_from, "
                + "doc.cover_image_url AS cover_image_url, "
                + "doc.banner_url AS banner_url, "
                + "doc.banner_position_x AS banner_position_x, "
                + "doc.banner_position_y AS banner_position_y, "
                + "doc.banner_zoom AS banner_zoom, "
                + "doc.logo_url AS logo_url, "
                + "doc.logo_position_x AS logo_position_x, "
                + "doc.logo_position_y AS logo_position_y, "
                + "doc.logo_zoom AS logo_zoom, "
                + "doc.fallback_photo_url AS fallback_photo_url, "
                + "doc.location_text AS location_text "
                + "FROM " + PROFESSIONAL_DOCUMENT_VIEW + " doc "
                + "WHERE doc.professional_id IN (:ids)";

        List<SearchItemResponse> rawItems = jdbcTemplate.query(sql, params, SEARCH_ROW_MAPPER);
        Map<Long, SearchItemResponse> byId = new HashMap<>();
        for (SearchItemResponse item : rawItems) {
            try {
                byId.put(Long.valueOf(item.getId()), item);
            } catch (NumberFormatException ignored) {
                // Mantiene tolerancia ante datos legacy malformados.
            }
        }

        List<SearchItemResponse> ordered = new ArrayList<>();
        for (Long professionalId : professionalIds) {
            SearchItemResponse item = byId.get(professionalId);
            if (item != null) {
                ordered.add(item);
            }
        }
        return ordered;
    }

    private String buildSearchWhereClause(String dateMatchExpression, String availableNowMatchExpression) {
        return " WHERE 1 = 1 "
            + " AND (:categorySlug = '' OR doc.category_slugs::text[] @> ARRAY[:categorySlug]::text[] OR doc.rubro_slug = :categorySlug) "
            + buildLocationClause("doc")
            + " AND (:dateFilter = false OR " + dateMatchExpression + ") "
            + " AND (:availableNow = false OR " + availableNowMatchExpression + ") "
            + " AND (:queryBlank = true OR ("
            + "   (:type = 'RUBRO' AND ("
            + "     doc.rubro_normalized % :queryNormalized "
            + "     OR doc.rubro_normalized LIKE :queryLike "
            + "     OR doc.rubro_slug = :querySlug "
            + "     OR doc.category_names_normalized LIKE :queryLike "
            + "     OR doc.service_category_names_normalized LIKE :queryLike "
            + "     OR doc.category_slugs::text[] @> ARRAY[:querySlug]::text[]"
            + "   )) "
            + "   OR (:type = 'PROFESIONAL' AND ("
            + "     doc.name_normalized % :queryNormalized "
            + "     OR doc.headline_normalized % :queryNormalized "
            + "     OR doc.name_normalized LIKE :queryLike "
            + "     OR doc.headline_normalized LIKE :queryLike "
            + "     OR doc.search_vector @@ plainto_tsquery('simple', :queryTs)"
            + "   )) "
            + "   OR (:type = 'LOCAL' AND ("
            + "     doc.name_normalized % :queryNormalized "
            + "     OR doc.headline_normalized % :queryNormalized "
            + "     OR doc.location_text_normalized % :queryNormalized "
            + "     OR doc.name_normalized LIKE :queryLike "
            + "     OR doc.headline_normalized LIKE :queryLike "
            + "     OR doc.location_text_normalized LIKE :queryLike "
            + "     OR doc.search_vector @@ plainto_tsquery('simple', :queryTs)"
            + "   )) "
            + "   OR (:type = 'SERVICIO' AND ("
            + "     doc.service_names_normalized % :queryNormalized "
            + "     OR doc.service_names_normalized LIKE :queryLike "
            + "     OR doc.name_normalized % :queryNormalized "
            + "     OR doc.rubro_normalized % :queryNormalized "
            + "     OR doc.name_normalized LIKE :queryLike "
            + "     OR doc.rubro_normalized LIKE :queryLike "
            + "     OR doc.service_category_names_normalized LIKE :queryLike "
            + "     OR doc.search_vector @@ plainto_tsquery('simple', :queryTs)"
            + "   )) "
            + "   OR ("
            + "     doc.search_document_normalized LIKE :queryLike "
            + "     OR doc.rubro_slug = :querySlug "
            + "     OR doc.category_slugs::text[] @> ARRAY[:querySlug]::text[] "
            + "     OR doc.search_vector @@ plainto_tsquery('simple', :queryTs)"
            + "   )"
            + " )) "
            + " AND (:queryBlank = true OR ("
            + "   GREATEST("
            + "     similarity(doc.name_normalized, :queryNormalized), "
            + "     similarity(doc.headline_normalized, :queryNormalized), "
            + "     similarity(doc.rubro_normalized, :queryNormalized), "
            + "     similarity(doc.category_names_normalized, :queryNormalized), "
            + "     similarity(doc.service_names_normalized, :queryNormalized), "
            + "     similarity(doc.service_category_names_normalized, :queryNormalized), "
            + "     COALESCE(ts_rank_cd(doc.search_vector, plainto_tsquery('simple', :queryTs)), 0.0)"
            + "   ) >= :similarityThreshold "
            + "   OR doc.search_document_normalized LIKE :queryLike "
            + "   OR doc.rubro_slug = :querySlug "
            + "   OR doc.category_slugs::text[] @> ARRAY[:querySlug]::text[] "
            + "   OR doc.search_vector @@ plainto_tsquery('simple', :queryTs)"
            + " ))";
    }

    private String buildSortClause(SearchQueryCriteria criteria) {
        String availabilitySortPrefix = buildAvailabilitySortPrefix(criteria);
        SearchSort sort = criteria.sort();
        if (sort == SearchSort.DISTANCE && criteria.hasCoordinates()) {
            return " ORDER BY "
                + availabilitySortPrefix
                + "distance_km ASC NULLS LAST, rating DESC, reviews_count DESC, name ASC";
        }
        if (sort == SearchSort.RATING) {
            return " ORDER BY "
                + availabilitySortPrefix
                + "rating DESC, reviews_count DESC, relevance DESC, name ASC";
        }
        if (criteria.query() == null || criteria.query().isBlank()) {
            return " ORDER BY "
                + availabilitySortPrefix
                + "rating DESC, reviews_count DESC, name ASC";
        }
        return " ORDER BY "
            + availabilitySortPrefix
            + "relevance DESC, rating DESC, reviews_count DESC, name ASC";
    }

    private String buildAvailabilitySortPrefix(SearchQueryCriteria criteria) {
        StringBuilder sortPrefix = new StringBuilder();
        if (criteria.availableNow()) {
            sortPrefix.append("available_now_match DESC, ");
        }
        if (criteria.dateFrom() != null && criteria.dateTo() != null) {
            sortPrefix.append("date_match DESC, ");
        }
        return sortPrefix.toString();
    }

    private String buildDateMatchExpression(String alias, String availabilitySource, boolean nextAvailableAtEnabled) {
        return "EXISTS ("
            + "SELECT 1 FROM available_slot a "
            + "WHERE a.professional_id = " + alias + ".professional_id "
            + "AND a.status = 'AVAILABLE' "
            + "AND a.start_at >= :dateStart "
            + "AND a.start_at < :dateEnd"
            + ")";
    }

    private String buildAvailableNowMatchExpression(String alias, String availabilitySource) {
        return "EXISTS ("
            + "SELECT 1 FROM available_slot a "
            + "WHERE a.professional_id = " + alias + ".professional_id "
            + "AND a.status = 'AVAILABLE' "
            + "AND CURRENT_TIMESTAMP >= a.start_at "
            + "AND CURRENT_TIMESTAMP < a.end_at"
            + ")";
    }

    private String buildLocationClause(String alias) {
        return " AND ("
            + "   :city = '' "
            + "   OR :hasCoords = true "
            + "   OR " + alias + ".location_text_normalized LIKE :cityLike "
            + " ) "
            + " AND ("
            + "   :hasCoords = false "
            + "   OR ("
            + "     " + alias + ".geom IS NOT NULL AND ST_DWithin(" + alias + ".geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)"
            + "   )"
            + " ) ";
    }

    private String buildDistanceExpression(String alias) {
        return "CASE "
            + "  WHEN :hasCoords = true AND " + alias + ".geom IS NOT NULL THEN ROUND((ST_Distance(" + alias + ".geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000.0)::numeric, 2)::double precision "
            + "  WHEN :hasCoords = true AND " + alias + ".latitude IS NOT NULL AND " + alias + ".longitude IS NOT NULL THEN ROUND((6371.0 * acos(least(1.0, greatest(-1.0, "
            + "    cos(radians(:lat)) * cos(radians(" + alias + ".latitude)) * cos(radians(" + alias + ".longitude) - radians(:lng)) "
            + "    + sin(radians(:lat)) * sin(radians(" + alias + ".latitude)) "
            + "  ))))::numeric, 2)::double precision "
            + "  ELSE NULL "
            + "END";
    }

    private MapSqlParameterSource buildParams(SearchQueryCriteria criteria) {
        String query = normalize(criteria.query());
        String city = normalize(criteria.city());
        String categorySlug = SlugUtils.toSlug(criteria.categorySlug());

        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("type", criteria.type().name());
        params.addValue("queryNormalized", query);
        params.addValue("queryBlank", query.isBlank());
        params.addValue("queryLike", "%" + query + "%");
        params.addValue("querySlug", SlugUtils.toSlug(criteria.query()));
        params.addValue("queryTs", query.isBlank() ? "plura" : query);
        params.addValue("city", city);
        params.addValue("cityLike", "%" + city + "%");
        params.addValue("categorySlug", categorySlug);
        params.addValue("hasCoords", criteria.hasCoordinates());
        params.addValue("lat", criteria.lat());
        params.addValue("lng", criteria.lng());
        params.addValue("radiusMeters", Math.max(criteria.radiusKm(), 1d) * 1000d);
        params.addValue("radiusKm", Math.max(criteria.radiusKm(), 1d));
        params.addValue("dateFilter", criteria.dateFrom() != null && criteria.dateTo() != null);
        params.addValue("dateStart", criteria.dateFrom() == null ? null : criteria.dateFrom().atStartOfDay());
        params.addValue("dateEnd", criteria.dateTo() == null ? null : criteria.dateTo().plusDays(1).atStartOfDay());
        params.addValue("availableNow", criteria.availableNow());
        params.addValue("similarityThreshold", QUERY_SIMILARITY_THRESHOLD);
        params.addValue("limit", criteria.size());
        params.addValue("limitPlusOne", criteria.size() + 1);
        params.addValue("offset", criteria.offset());
        return params;
    }

    private MapSqlParameterSource buildSuggestParams(SearchSuggestCriteria criteria) {
        String query = normalize(criteria.query());
        String city = normalize(criteria.city());
        int normalizedLimit = Math.max(1, Math.min(criteria.limit(), 10));

        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("queryNormalized", query);
        params.addValue("queryBlank", query.isBlank());
        params.addValue("queryLike", "%" + query + "%");
        params.addValue("querySlug", SlugUtils.toSlug(criteria.query()));
        params.addValue("queryTs", query.isBlank() ? "plura" : query);
        params.addValue("city", city);
        params.addValue("cityLike", "%" + city + "%");
        params.addValue("hasCoords", criteria.hasCoordinates());
        params.addValue("lat", criteria.lat());
        params.addValue("lng", criteria.lng());
        params.addValue("radiusMeters", Math.max(criteria.radiusKm(), 1d) * 1000d);
        params.addValue("radiusKm", Math.max(criteria.radiusKm(), 1d));
        params.addValue("limit", normalizedLimit);
        params.addValue("profilePoolLimit", Math.max(normalizedLimit * 4, 24));
        params.addValue("categoryLimit", MAX_CATEGORY_SUGGESTIONS);
        params.addValue("popularLimit", MAX_POPULAR_NEARBY);
        return params;
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String lowered = value.trim().toLowerCase(Locale.ROOT);
        return Normalizer.normalize(lowered, Normalizer.Form.NFD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
    }

    private record SuggestProfileCandidate(
        String id,
        String fullName,
        String localName,
        double rating,
        int reviewsCount,
        double professionalScore,
        double localScore
    ) {}

    private static final RowMapper<SearchItemResponse> SEARCH_ROW_MAPPER = new RowMapper<>() {
        @Override
        public SearchItemResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new SearchItemResponse(
                rs.getString("id"),
                rs.getString("slug"),
                rs.getString("name"),
                rs.getString("headline"),
                rs.getObject("rating") == null ? null : rs.getDouble("rating"),
                rs.getObject("reviews_count") == null ? null : rs.getInt("reviews_count"),
                readCategorySlugs(rs.getArray("category_slugs")),
                rs.getObject("distance_km") == null ? null : rs.getDouble("distance_km"),
                rs.getObject("latitude") == null ? null : rs.getDouble("latitude"),
                rs.getObject("longitude") == null ? null : rs.getDouble("longitude"),
                rs.getObject("price_from") == null ? null : rs.getDouble("price_from"),
                rs.getString("cover_image_url"),
                rs.getString("banner_url"),
                mediaPresentation(
                    rs.getObject("banner_position_x") == null ? null : rs.getDouble("banner_position_x"),
                    rs.getObject("banner_position_y") == null ? null : rs.getDouble("banner_position_y"),
                    rs.getObject("banner_zoom") == null ? null : rs.getDouble("banner_zoom")
                ),
                rs.getString("logo_url"),
                mediaPresentation(
                    rs.getObject("logo_position_x") == null ? null : rs.getDouble("logo_position_x"),
                    rs.getObject("logo_position_y") == null ? null : rs.getDouble("logo_position_y"),
                    rs.getObject("logo_zoom") == null ? null : rs.getDouble("logo_zoom")
                ),
                rs.getString("fallback_photo_url"),
                rs.getString("location_text")
            );
        }

        private com.plura.plurabackend.professional.dto.MediaPresentationDto mediaPresentation(
            Double positionX,
            Double positionY,
            Double zoom
        ) {
            return new com.plura.plurabackend.professional.dto.MediaPresentationDto(
                positionX != null ? positionX : 50d,
                positionY != null ? positionY : 50d,
                zoom != null ? zoom : 1d
            );
        }

        private List<String> readCategorySlugs(Array array) throws SQLException {
            if (array == null) {
                return List.of();
            }
            Object raw = array.getArray();
            if (raw instanceof String[] values) {
                return Arrays.stream(values)
                    .filter(value -> value != null && !value.isBlank())
                    .toList();
            }
            return List.of();
        }
    };

    private static final RowMapper<SearchSuggestItemResponse> SEARCH_SUGGEST_ITEM_ROW_MAPPER =
        (rs, rowNum) -> new SearchSuggestItemResponse(rs.getString("id"), rs.getString("name"));

    public record SearchPageResult(long total, List<SearchItemResponse> items, boolean hasNext) {}
}

package com.plura.plurabackend.search;

import com.plura.plurabackend.common.util.SlugUtils;
import com.plura.plurabackend.search.dto.SearchItemResponse;
import com.plura.plurabackend.search.dto.SearchSort;
import com.plura.plurabackend.search.dto.SearchSuggestCategoryResponse;
import com.plura.plurabackend.search.dto.SearchSuggestItemResponse;
import com.plura.plurabackend.search.dto.SearchSuggestResponse;
import com.plura.plurabackend.search.dto.SearchType;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.text.Normalizer;
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
        MapSqlParameterSource params = buildParams(criteria);
        params.addValue("nextAvailableAtEnabled", nextAvailableAtEnabled);

        String baseFromClause = buildBaseFromClause();
        String dateMatchExpression = buildDateMatchExpression(availabilitySource, nextAvailableAtEnabled);
        String availableNowMatchExpression = buildAvailableNowMatchExpression(availabilitySource);
        String baseWhereClause = buildBaseWhereClause(availableNowMatchExpression);
        String countSql = "SELECT COUNT(*) " + baseFromClause + baseWhereClause;

        String selectSql =
            "SELECT "
                + "p.id::text AS id, "
                + "COALESCE(NULLIF(p.slug, ''), regexp_replace(immutable_unaccent(lower(COALESCE(u.full_name, 'profesional'))), '[^a-z0-9]+', '-', 'g')) AS slug, "
                + "COALESCE(u.full_name, 'Profesional') AS name, "
                + "COALESCE(p.public_headline, '') AS headline, "
                + "COALESCE(p.rating, 0)::double precision AS rating, "
                + "COALESCE(p.reviews_count, 0)::integer AS reviews_count, "
                + "COALESCE(p.location_text, p.location, '') AS location_text, "
                + "COALESCE(p.latitude, CASE WHEN p.geom IS NOT NULL THEN ST_Y(p.geom::geometry) END)::double precision AS latitude, "
                + "COALESCE(p.longitude, CASE WHEN p.geom IS NOT NULL THEN ST_X(p.geom::geometry) END)::double precision AS longitude, "
                + "svc_agg.price_from, "
                + "COALESCE(cat_slugs.category_slugs, ARRAY[]::text[]) AS category_slugs, "
                + "COALESCE(photo_agg.url, cat_img.image_url) AS cover_image_url, "
                + "CASE "
                + "  WHEN :hasCoords = true AND p.geom IS NOT NULL THEN ROUND((ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000.0)::numeric, 2)::double precision "
                + "  WHEN :hasCoords = true AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN ROUND((6371.0 * acos(least(1.0, greatest(-1.0, "
                + "    cos(radians(:lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(:lng)) "
                + "    + sin(radians(:lat)) * sin(radians(p.latitude)) "
                + "  ))))::numeric, 2)::double precision "
                + "  ELSE NULL "
                + "END AS distance_km, "
                + "CASE "
                + "  WHEN :dateFilter = true AND " + dateMatchExpression + " THEN 1 ELSE 0 "
                + "END AS date_match, "
                + "CASE "
                + "  WHEN :availableNow = true AND " + availableNowMatchExpression + " THEN 1 ELSE 0 "
                + "END AS available_now_match, "
                + "CASE "
                + "  WHEN :queryBlank = true THEN 0.0 "
                + "  ELSE GREATEST("
                + "    similarity(immutable_unaccent(lower(COALESCE(u.full_name, ''))), :queryNormalized), "
                + "    similarity(immutable_unaccent(lower(COALESCE(p.public_headline, ''))), :queryNormalized), "
                + "    similarity(immutable_unaccent(lower(COALESCE(p.rubro, ''))), :queryNormalized), "
                + "    COALESCE(svc_agg.max_name_sim, 0.0), "
                + "    COALESCE(cat_agg.max_name_sim, 0.0), "
                + "    COALESCE(svc_cat_agg.max_name_sim, 0.0)"
                + "  ) "
                + "END AS relevance "
                + baseFromClause
                + " LEFT JOIN LATERAL ("
                + "   SELECT array_agg(c.slug ORDER BY COALESCE(c.display_order, 9999), c.name) AS category_slugs "
                + "   FROM professional_categories pc "
                + "   JOIN categories c ON c.id = pc.category_id "
                + "   WHERE pc.professional_id = p.id AND c.active = true"
                + " ) cat_slugs ON true"
                + " LEFT JOIN LATERAL ("
                + "   SELECT photo.url "
                + "   FROM professional_profile_photos photo "
                + "   WHERE photo.professional_id = p.id "
                + "   ORDER BY photo.position ASC LIMIT 1"
                + " ) photo_agg ON true"
                + " LEFT JOIN LATERAL ("
                + "   SELECT c.image_url "
                + "   FROM professional_categories pc "
                + "   JOIN categories c ON c.id = pc.category_id "
                + "   WHERE pc.professional_id = p.id AND c.active = true "
                + "   ORDER BY COALESCE(c.display_order, 9999), c.name LIMIT 1"
                + " ) cat_img ON true"
                + baseWhereClause
                + buildSortClause(criteria)
                + (searchNoCountModeEnabled ? " LIMIT :limitPlusOne OFFSET :offset" : " LIMIT :limit OFFSET :offset");

        if (!searchNoCountModeEnabled) {
            Long total = jdbcTemplate.queryForObject(countSql, params, Long.class);
            List<SearchItemResponse> items = jdbcTemplate.query(selectSql, params, SEARCH_ROW_MAPPER);
            return new SearchPageResult(total == null ? 0L : total, items, false);
        }

        List<SearchItemResponse> rows = jdbcTemplate.query(selectSql, params, SEARCH_ROW_MAPPER);
        boolean hasNext = rows.size() > criteria.size();
        List<SearchItemResponse> items = hasNext
            ? rows.subList(0, criteria.size())
            : rows;
        long totalEstimate = hasNext
            ? criteria.offset() + items.size() + 1L
            : criteria.offset() + items.size();
        return new SearchPageResult(totalEstimate, items, hasNext);
    }

    public SearchSuggestResponse suggest(SearchSuggestCriteria criteria) {
        MapSqlParameterSource params = buildSuggestParams(criteria);
        String locationClause = buildSuggestLocationClause();

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
            "SELECT NULL::text AS id, s.name AS name "
                + "FROM professional_service s "
                + "JOIN professional_profile p ON p.id = s.professional_id "
                + "WHERE s.active = true "
                + "AND p.active = true "
                + locationClause
                + "AND (:queryBlank = true OR ("
                + "  immutable_unaccent(lower(s.name)) % :queryNormalized "
                + "  OR immutable_unaccent(lower(s.name)) LIKE :queryLike"
                + ")) "
                + "GROUP BY s.name "
                + "ORDER BY "
                + "CASE WHEN :queryBlank = false THEN MAX(similarity(immutable_unaccent(lower(s.name)), :queryNormalized)) ELSE NULL END DESC NULLS LAST, "
                + "COUNT(*) DESC, s.name ASC "
                + "LIMIT :limit";

        String profilesSql =
            "SELECT p.id::text AS id, "
                + "COALESCE(u.full_name, 'Profesional') AS full_name, "
                + "COALESCE(NULLIF(p.public_headline, ''), COALESCE(u.full_name, 'Profesional')) AS local_name, "
                + "COALESCE(p.rating, 0)::double precision AS rating, "
                + "COALESCE(p.reviews_count, 0)::integer AS reviews_count, "
                + "GREATEST("
                + "  similarity(immutable_unaccent(lower(COALESCE(u.full_name, ''))), :queryNormalized), "
                + "  similarity(immutable_unaccent(lower(COALESCE(p.public_headline, ''))), :queryNormalized)"
                + ") AS professional_score, "
                + "GREATEST("
                + "  similarity(immutable_unaccent(lower(COALESCE(p.public_headline, ''))), :queryNormalized), "
                + "  similarity(immutable_unaccent(lower(COALESCE(u.full_name, ''))), :queryNormalized), "
                + "  similarity(immutable_unaccent(lower(COALESCE(p.location_text, p.location, ''))), :queryNormalized)"
                + ") AS local_score "
                + "FROM professional_profile p "
                + "JOIN app_user u ON u.id = p.user_id "
                + "WHERE p.active = true "
                + locationClause
                + "AND (:queryBlank = true OR ("
                + "  immutable_unaccent(lower(COALESCE(u.full_name, ''))) % :queryNormalized "
                + "  OR immutable_unaccent(lower(COALESCE(p.public_headline, ''))) % :queryNormalized "
                + "  OR immutable_unaccent(lower(COALESCE(p.location_text, p.location, ''))) % :queryNormalized "
                + "  OR immutable_unaccent(lower(COALESCE(u.full_name, ''))) LIKE :queryLike"
                + "  OR immutable_unaccent(lower(COALESCE(p.public_headline, ''))) LIKE :queryLike"
                + "  OR immutable_unaccent(lower(COALESCE(p.location_text, p.location, ''))) LIKE :queryLike"
                + ")) "
                + "ORDER BY COALESCE(p.rating, 0) DESC, COALESCE(p.reviews_count, 0) DESC, full_name ASC "
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
                + "p.id::text AS id, "
                + "COALESCE(NULLIF(p.slug, ''), regexp_replace(immutable_unaccent(lower(COALESCE(u.full_name, 'profesional'))), '[^a-z0-9]+', '-', 'g')) AS slug, "
                + "COALESCE(u.full_name, 'Profesional') AS name, "
                + "COALESCE(p.public_headline, '') AS headline, "
                + "COALESCE(p.rating, 0)::double precision AS rating, "
                + "COALESCE(p.reviews_count, 0)::integer AS reviews_count, "
                + "COALESCE(cat_agg.category_slugs, ARRAY[]::text[]) AS category_slugs, "
                + "CASE "
                + "  WHEN :hasCoords = true AND p.geom IS NOT NULL THEN ROUND((ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000.0)::numeric, 2)::double precision "
                + "  WHEN :hasCoords = true AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN ROUND((6371.0 * acos(least(1.0, greatest(-1.0, "
                + "    cos(radians(:lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(:lng)) "
                + "    + sin(radians(:lat)) * sin(radians(p.latitude)) "
                + "  ))))::numeric, 2)::double precision "
                + "  ELSE NULL "
                + "END AS distance_km, "
                + "COALESCE(p.latitude, CASE WHEN p.geom IS NOT NULL THEN ST_Y(p.geom::geometry) END)::double precision AS latitude, "
                + "COALESCE(p.longitude, CASE WHEN p.geom IS NOT NULL THEN ST_X(p.geom::geometry) END)::double precision AS longitude, "
                + "svc_agg.price_from, "
                + "COALESCE(photo_agg.url, cat_img.image_url) AS cover_image_url, "
                + "COALESCE(p.location_text, p.location, '') AS location_text "
                + "FROM professional_profile p "
                + "JOIN app_user u ON u.id = p.user_id "
                + "LEFT JOIN LATERAL ("
                + "   SELECT MIN(NULLIF(regexp_replace(s.price, '[^0-9]', '', 'g'), '')::double precision) AS price_from "
                + "   FROM professional_service s "
                + "   WHERE s.professional_id = p.id AND s.active = true"
                + ") svc_agg ON true "
                + "LEFT JOIN LATERAL ("
                + "   SELECT array_agg(c.slug ORDER BY COALESCE(c.display_order, 9999), c.name) AS category_slugs "
                + "   FROM professional_categories pc "
                + "   JOIN categories c ON c.id = pc.category_id "
                + "   WHERE pc.professional_id = p.id AND c.active = true"
                + ") cat_agg ON true "
                + "LEFT JOIN LATERAL ("
                + "   SELECT photo.url "
                + "   FROM professional_profile_photos photo "
                + "   WHERE photo.professional_id = p.id "
                + "   ORDER BY photo.position ASC LIMIT 1"
                + ") photo_agg ON true "
                + "LEFT JOIN LATERAL ("
                + "   SELECT c.image_url "
                + "   FROM professional_categories pc "
                + "   JOIN categories c ON c.id = pc.category_id "
                + "   WHERE pc.professional_id = p.id AND c.active = true "
                + "   ORDER BY COALESCE(c.display_order, 9999), c.name LIMIT 1"
                + ") cat_img ON true "
                + "WHERE p.active = true "
                + "AND p.id IN (:ids)";

        List<SearchItemResponse> rawItems = jdbcTemplate.query(sql, params, SEARCH_ROW_MAPPER);
        Map<Long, SearchItemResponse> byId = new HashMap<>();
        for (SearchItemResponse item : rawItems) {
            try {
                byId.put(Long.valueOf(item.getId()), item);
            } catch (NumberFormatException ignored) {
                // No-op, keeps robustness if malformed ID appears.
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

    private String buildBaseFromClause() {
        return " FROM professional_profile p "
            + " JOIN app_user u ON u.id = p.user_id "
            + " LEFT JOIN LATERAL ("
            + "   SELECT MIN(NULLIF(regexp_replace(s.price, '[^0-9]', '', 'g'), '')::double precision) AS price_from, "
            + "          MAX(CASE WHEN :queryBlank = true THEN 0.0 ELSE similarity(immutable_unaccent(lower(COALESCE(s.name, ''))), :queryNormalized) END) AS max_name_sim "
            + "   FROM professional_service s "
            + "   WHERE s.professional_id = p.id AND s.active = true"
            + " ) svc_agg ON true "
            + " LEFT JOIN LATERAL ("
            + "   SELECT MAX(CASE WHEN :queryBlank = true THEN 0.0 ELSE similarity(immutable_unaccent(lower(COALESCE(c.name, ''))), :queryNormalized) END) AS max_name_sim "
            + "   FROM professional_categories pc "
            + "   JOIN categories c ON c.id = pc.category_id "
            + "   WHERE pc.professional_id = p.id AND c.active = true"
            + " ) cat_agg ON true "
            + " LEFT JOIN LATERAL ("
            + "   SELECT MAX(CASE WHEN :queryBlank = true THEN 0.0 ELSE similarity(immutable_unaccent(lower(COALESCE(c.name, ''))), :queryNormalized) END) AS max_name_sim, "
            + "          BOOL_OR(CASE WHEN :categorySlug = '' THEN false ELSE c.slug = :categorySlug END) AS has_filter_category, "
            + "          BOOL_OR(CASE WHEN :queryBlank = true THEN false ELSE c.slug = :querySlug END) AS has_query_slug_match, "
            + "          BOOL_OR(CASE WHEN :queryBlank = true THEN false ELSE immutable_unaccent(lower(COALESCE(c.name, ''))) LIKE :queryLike END) AS has_query_like_match "
            + "   FROM professional_service s "
            + "   JOIN categories c ON c.id = s.category_id "
            + "   WHERE s.professional_id = p.id AND s.active = true AND c.active = true"
            + " ) svc_cat_agg ON true ";
    }

    private String buildBaseWhereClause(String availableNowMatchExpression) {
        return " WHERE p.active = true "
            + " AND (:categorySlug = '' OR ("
            + "   COALESCE(svc_cat_agg.has_filter_category, false) = true "
            + "   OR "
            + "   EXISTS ("
            + "     SELECT 1 FROM professional_categories pc "
            + "     JOIN categories c ON c.id = pc.category_id "
            + "     WHERE pc.professional_id = p.id "
            + "     AND c.active = true "
            + "     AND c.slug = :categorySlug"
            + "   ) "
            + "   OR regexp_replace(regexp_replace(immutable_unaccent(lower(COALESCE(p.rubro, ''))), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g') = :categorySlug"
            + " )) "
            + " AND ("
            + "   :city = '' "
            + "   OR immutable_unaccent(lower(COALESCE(p.location_text, p.location, ''))) LIKE :cityLike "
            + "   OR NOT EXISTS ("
            + "     SELECT 1 FROM professional_profile p_city "
            + "     WHERE p_city.active = true "
            + "     AND immutable_unaccent(lower(COALESCE(p_city.location_text, p_city.location, ''))) LIKE :cityLike"
            + "   )"
            + " ) "
            + " AND ("
            + "   :hasCoords = false "
            + "   OR ("
            + "     (p.geom IS NOT NULL AND ST_DWithin(p.geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)) "
            + "     OR ("
            + "       p.latitude IS NOT NULL "
            + "       AND p.longitude IS NOT NULL "
            + "       AND (6371.0 * acos(least(1.0, greatest(-1.0, "
            + "         cos(radians(:lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(:lng)) "
            + "         + sin(radians(:lat)) * sin(radians(p.latitude)) "
            + "       )))) <= :radiusKm"
            + "     )"
            + "   )"
            + " ) "
            + " AND (:availableNow = false OR " + availableNowMatchExpression + ") "
            + " AND (:queryBlank = true OR ("
            + "   (:type = 'RUBRO' AND ("
            + "     immutable_unaccent(lower(COALESCE(p.rubro, ''))) % :queryNormalized "
            + "     OR immutable_unaccent(lower(COALESCE(p.rubro, ''))) LIKE :queryLike "
            + "     OR regexp_replace(regexp_replace(immutable_unaccent(lower(COALESCE(p.rubro, ''))), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g') = :querySlug "
            + "     OR COALESCE(svc_cat_agg.max_name_sim, 0.0) >= :similarityThreshold "
            + "     OR COALESCE(svc_cat_agg.has_query_slug_match, false) = true "
            + "     OR COALESCE(svc_cat_agg.has_query_like_match, false) = true "
            + "     OR EXISTS ("
            + "       SELECT 1 FROM professional_categories pc "
            + "       JOIN categories c ON c.id = pc.category_id "
            + "       WHERE pc.professional_id = p.id "
            + "       AND c.active = true "
            + "       AND ("
            + "         c.slug = :querySlug "
            + "         OR immutable_unaccent(lower(c.name)) % :queryNormalized "
            + "         OR immutable_unaccent(lower(c.name)) LIKE :queryLike"
            + "       )"
            + "     )"
            + "   )) "
            + "   OR (:type = 'PROFESIONAL' AND ("
            + "     immutable_unaccent(lower(COALESCE(u.full_name, ''))) % :queryNormalized "
            + "     OR immutable_unaccent(lower(COALESCE(p.public_headline, ''))) % :queryNormalized "
            + "     OR immutable_unaccent(lower(COALESCE(u.full_name, ''))) LIKE :queryLike "
            + "     OR immutable_unaccent(lower(COALESCE(p.public_headline, ''))) LIKE :queryLike"
            + "   )) "
            + "   OR (:type = 'LOCAL' AND ("
            + "     immutable_unaccent(lower(COALESCE(u.full_name, ''))) % :queryNormalized "
            + "     OR immutable_unaccent(lower(COALESCE(p.public_headline, ''))) % :queryNormalized "
            + "     OR immutable_unaccent(lower(COALESCE(p.location_text, p.location, ''))) % :queryNormalized "
            + "     OR immutable_unaccent(lower(COALESCE(u.full_name, ''))) LIKE :queryLike "
            + "     OR immutable_unaccent(lower(COALESCE(p.public_headline, ''))) LIKE :queryLike "
            + "     OR immutable_unaccent(lower(COALESCE(p.location_text, p.location, ''))) LIKE :queryLike"
            + "   )) "
            + "   OR (:type = 'SERVICIO' AND ("
            + "     EXISTS ("
            + "       SELECT 1 FROM professional_service s "
            + "       WHERE s.professional_id = p.id "
            + "       AND s.active = true "
            + "       AND ("
            + "         immutable_unaccent(lower(COALESCE(s.name, ''))) % :queryNormalized "
            + "         OR immutable_unaccent(lower(COALESCE(s.name, ''))) LIKE :queryLike"
            + "       )"
            + "     )"
            + "     OR immutable_unaccent(lower(COALESCE(u.full_name, ''))) % :queryNormalized "
            + "     OR immutable_unaccent(lower(COALESCE(p.rubro, ''))) % :queryNormalized "
            + "     OR immutable_unaccent(lower(COALESCE(u.full_name, ''))) LIKE :queryLike "
            + "     OR immutable_unaccent(lower(COALESCE(p.rubro, ''))) LIKE :queryLike"
            + "     OR COALESCE(svc_cat_agg.max_name_sim, 0.0) >= :similarityThreshold "
            + "     OR COALESCE(svc_cat_agg.has_query_slug_match, false) = true "
            + "     OR COALESCE(svc_cat_agg.has_query_like_match, false) = true "
            + "   )) "
            + "   OR ("
            + "     immutable_unaccent(lower(COALESCE(u.full_name, ''))) LIKE :queryLike "
            + "     OR immutable_unaccent(lower(COALESCE(p.public_headline, ''))) LIKE :queryLike "
            + "     OR immutable_unaccent(lower(COALESCE(p.rubro, ''))) LIKE :queryLike "
            + "     OR regexp_replace(regexp_replace(immutable_unaccent(lower(COALESCE(p.rubro, ''))), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g') = :querySlug "
            + "     OR COALESCE(svc_cat_agg.max_name_sim, 0.0) >= :similarityThreshold "
            + "     OR COALESCE(svc_cat_agg.has_query_slug_match, false) = true "
            + "     OR COALESCE(svc_cat_agg.has_query_like_match, false) = true "
            + "     OR EXISTS ("
            + "       SELECT 1 FROM professional_service s "
            + "       WHERE s.professional_id = p.id "
            + "       AND s.active = true "
            + "       AND immutable_unaccent(lower(COALESCE(s.name, ''))) LIKE :queryLike"
            + "     ) "
            + "     OR EXISTS ("
            + "       SELECT 1 FROM professional_categories pc "
            + "       JOIN categories c ON c.id = pc.category_id "
            + "       WHERE pc.professional_id = p.id "
            + "       AND c.active = true "
            + "       AND (c.slug = :querySlug OR immutable_unaccent(lower(c.name)) LIKE :queryLike)"
            + "     )"
            + "   ) "
            + " )) "
            + " AND (:queryBlank = true OR ("
            + "   GREATEST("
            + "     similarity(immutable_unaccent(lower(COALESCE(u.full_name, ''))), :queryNormalized), "
            + "     similarity(immutable_unaccent(lower(COALESCE(p.public_headline, ''))), :queryNormalized), "
            + "     similarity(immutable_unaccent(lower(COALESCE(p.rubro, ''))), :queryNormalized), "
            + "     COALESCE(svc_agg.max_name_sim, 0.0), "
            + "     COALESCE(cat_agg.max_name_sim, 0.0), "
            + "     COALESCE(svc_cat_agg.max_name_sim, 0.0)"
            + "   ) >= :similarityThreshold"
            + "   OR immutable_unaccent(lower(COALESCE(u.full_name, ''))) LIKE :queryLike "
            + "   OR immutable_unaccent(lower(COALESCE(p.public_headline, ''))) LIKE :queryLike "
            + "   OR immutable_unaccent(lower(COALESCE(p.rubro, ''))) LIKE :queryLike "
            + "   OR regexp_replace(regexp_replace(immutable_unaccent(lower(COALESCE(p.rubro, ''))), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g') = :querySlug "
            + "   OR COALESCE(svc_cat_agg.has_query_slug_match, false) = true "
            + "   OR COALESCE(svc_cat_agg.has_query_like_match, false) = true "
            + "   OR EXISTS ("
            + "     SELECT 1 FROM professional_service s "
            + "     WHERE s.professional_id = p.id "
            + "     AND s.active = true "
            + "     AND immutable_unaccent(lower(COALESCE(s.name, ''))) LIKE :queryLike"
            + "   ) "
            + "   OR EXISTS ("
            + "     SELECT 1 FROM professional_categories pc "
            + "     JOIN categories c ON c.id = pc.category_id "
            + "     WHERE pc.professional_id = p.id "
            + "     AND c.active = true "
            + "     AND (c.slug = :querySlug OR immutable_unaccent(lower(c.name)) LIKE :queryLike)"
            + "   )"
            + "  ))";
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

    private String buildDateMatchExpression(String availabilitySource, boolean nextAvailableAtEnabled) {
        if ("FLAG".equalsIgnoreCase(availabilitySource)) {
            if (nextAvailableAtEnabled) {
                return "("
                    + "COALESCE(p.has_availability_today, false) = true "
                    + "OR ("
                    + "  p.next_available_at IS NOT NULL "
                    + "  AND p.next_available_at >= :dateStart "
                    + "  AND p.next_available_at < :dateEnd"
                    + ")"
                    + ")";
            }
            return "COALESCE(p.has_availability_today, false) = true";
        }
        return "EXISTS ("
            + "SELECT 1 FROM available_slot a "
            + "WHERE a.professional_id = p.id "
            + "AND a.status = 'AVAILABLE' "
            + "AND a.start_at >= :dateStart "
            + "AND a.start_at < :dateEnd"
            + ")";
    }

    private String buildAvailableNowMatchExpression(String availabilitySource) {
        if ("FLAG".equalsIgnoreCase(availabilitySource)) {
            return "COALESCE(p.has_availability_today, false) = true";
        }
        return "EXISTS ("
            + "SELECT 1 FROM available_slot a "
            + "WHERE a.professional_id = p.id "
            + "AND a.status = 'AVAILABLE' "
            + "AND CURRENT_TIMESTAMP >= a.start_at "
            + "AND CURRENT_TIMESTAMP < a.end_at"
            + ")";
    }

    private String buildSuggestLocationClause() {
        return " AND ("
            + "   :city = '' "
            + "   OR immutable_unaccent(lower(COALESCE(p.location_text, p.location, ''))) LIKE :cityLike "
            + "   OR NOT EXISTS ("
            + "     SELECT 1 FROM professional_profile p_city "
            + "     WHERE p_city.active = true "
            + "     AND immutable_unaccent(lower(COALESCE(p_city.location_text, p_city.location, ''))) LIKE :cityLike"
            + "   )"
            + " ) "
            + " AND ("
            + "   :hasCoords = false "
            + "   OR ("
            + "     (p.geom IS NOT NULL AND ST_DWithin(p.geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)) "
            + "     OR ("
            + "       p.latitude IS NOT NULL "
            + "       AND p.longitude IS NOT NULL "
            + "       AND (6371.0 * acos(least(1.0, greatest(-1.0, "
            + "         cos(radians(:lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(:lng)) "
            + "         + sin(radians(:lat)) * sin(radians(p.latitude)) "
            + "       )))) <= :radiusKm"
            + "     )"
            + "   )"
            + " ) ";
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
        params.addValue("city", city);
        params.addValue("cityLike", "%" + city + "%");
        params.addValue("categorySlug", categorySlug);

        params.addValue("hasCoords", criteria.hasCoordinates());
        params.addValue("lat", criteria.lat());
        params.addValue("lng", criteria.lng());
        params.addValue("radiusMeters", Math.max(criteria.radiusKm(), 1d) * 1000d);
        params.addValue("radiusKm", Math.max(criteria.radiusKm(), 1d));

        params.addValue("dateFilter", criteria.dateFrom() != null && criteria.dateTo() != null);
        params.addValue(
            "dateStart",
            criteria.dateFrom() == null ? null : criteria.dateFrom().atStartOfDay()
        );
        params.addValue(
            "dateEnd",
            criteria.dateTo() == null ? null : criteria.dateTo().plusDays(1).atStartOfDay()
        );
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
        params.addValue("city", city);
        params.addValue("cityLike", "%" + city + "%");
        params.addValue("hasCoords", criteria.hasCoordinates());
        params.addValue("lat", criteria.lat());
        params.addValue("lng", criteria.lng());
        params.addValue("radiusMeters", Math.max(criteria.radiusKm(), 1d) * 1000d);
        params.addValue("radiusKm", Math.max(criteria.radiusKm(), 1d));
        params.addValue("limit", normalizedLimit);
        params.addValue("profilePoolLimit", Math.max(normalizedLimit * 8, 80));
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
                rs.getString("location_text")
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

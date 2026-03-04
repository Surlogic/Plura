package com.plura.plurabackend.geo;

import com.plura.plurabackend.geo.dto.GeoAutocompleteItemResponse;
import java.util.List;
import java.util.Locale;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class GeoAutocompleteRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public GeoAutocompleteRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<GeoAutocompleteItemResponse> autocomplete(String rawQuery, int limit) {
        String query = rawQuery == null ? "" : rawQuery.trim().toLowerCase(Locale.ROOT);
        if (query.isBlank()) {
            return List.of();
        }

        String sql =
            "SELECT g.label, g.city, g.lat, g.lng "
                + "FROM geo_location_seed g "
                + "WHERE g.active = true "
                + "AND ("
                + "  immutable_unaccent(lower(g.label)) % :q "
                + "  OR immutable_unaccent(lower(g.city)) % :q "
                + "  OR immutable_unaccent(lower(g.label)) LIKE :qLike"
                + ") "
                + "ORDER BY GREATEST("
                + "  similarity(immutable_unaccent(lower(g.label)), :q), "
                + "  similarity(immutable_unaccent(lower(g.city)), :q)"
                + ") DESC, g.label ASC "
                + "LIMIT :limit";

        MapSqlParameterSource params = new MapSqlParameterSource()
            .addValue("q", query)
            .addValue("qLike", "%" + query + "%")
            .addValue("limit", Math.max(1, Math.min(limit, 20)));

        return jdbcTemplate.query(
            sql,
            params,
            (rs, rowNum) -> new GeoAutocompleteItemResponse(
                rs.getString("label"),
                rs.getString("city"),
                rs.getObject("lat") == null ? null : rs.getDouble("lat"),
                rs.getObject("lng") == null ? null : rs.getDouble("lng")
            )
        );
    }
}

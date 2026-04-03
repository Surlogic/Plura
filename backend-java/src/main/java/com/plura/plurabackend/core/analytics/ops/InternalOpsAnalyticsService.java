package com.plura.plurabackend.core.analytics.ops;

import com.plura.plurabackend.core.analytics.ops.dto.InternalOpsAnalyticsResponse;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InternalOpsAnalyticsService {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public InternalOpsAnalyticsService(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public InternalOpsAnalyticsResponse summary(String from, String to) {
        DateWindow window = resolveDateWindow(from, to);
        MapSqlParameterSource params = baseParams(window.fromDateTime(), window.toDateTime());

        return new InternalOpsAnalyticsResponse(
            loadOverview(window, params),
            loadCategoryPerformance(params),
            loadServicePerformance(params),
            loadFunnelByCategory(params),
            loadRetention(window),
            loadDemandByWeekday(params),
            loadDemandByHour(params),
            loadCityPerformance(params),
            loadProfessionalPerformance(params)
        );
    }

    private InternalOpsAnalyticsResponse.Overview loadOverview(
        DateWindow window,
        MapSqlParameterSource params
    ) {
        OverviewRow bookingRow = jdbcTemplate.queryForObject(
            """
            SELECT
                COUNT(*) AS total_reservations,
                COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completed_reservations,
                COALESCE(SUM(CASE WHEN b.status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS cancelled_reservations,
                COALESCE(SUM(CASE WHEN b.status = 'NO_SHOW' THEN 1 ELSE 0 END), 0) AS no_show_reservations,
                COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED' THEN COALESCE(b.service_price_snapshot, 0) ELSE 0 END), 0) AS estimated_revenue,
                COALESCE(AVG(CASE WHEN b.status <> 'CANCELLED' THEN COALESCE(b.service_price_snapshot, 0) END), 0) AS average_ticket
            FROM booking b
            WHERE b.created_at >= :from AND b.created_at < :to
            """,
            params,
            (rs, rowNum) -> new OverviewRow(
                rs.getLong("total_reservations"),
                rs.getLong("completed_reservations"),
                rs.getLong("cancelled_reservations"),
                rs.getLong("no_show_reservations"),
                rs.getDouble("estimated_revenue"),
                rs.getDouble("average_ticket")
            )
        );

        EventOverviewRow eventRow = jdbcTemplate.queryForObject(
            """
            SELECT
                COALESCE(SUM(CASE WHEN e.event_key = 'SEARCH_PERFORMED' THEN 1 ELSE 0 END), 0) AS total_searches,
                COALESCE(SUM(CASE WHEN e.event_key = 'PROFESSIONAL_PROFILE_VIEWED' THEN 1 ELSE 0 END), 0) AS total_profile_views
            FROM app_product_event e
            WHERE e.occurred_at >= :from AND e.occurred_at < :to
            """,
            params,
            (rs, rowNum) -> new EventOverviewRow(
                rs.getLong("total_searches"),
                rs.getLong("total_profile_views")
            )
        );

        return new InternalOpsAnalyticsResponse.Overview(
            window.fromDate().toString(),
            window.toDateExclusive().minusDays(1).toString(),
            bookingRow == null ? 0L : bookingRow.totalReservations(),
            bookingRow == null ? 0L : bookingRow.completedReservations(),
            bookingRow == null ? 0L : bookingRow.cancelledReservations(),
            bookingRow == null ? 0L : bookingRow.noShowReservations(),
            roundMoney(bookingRow == null ? 0d : bookingRow.estimatedRevenue()),
            roundMoney(bookingRow == null ? 0d : bookingRow.averageTicket()),
            eventRow == null ? 0L : eventRow.totalSearches(),
            eventRow == null ? 0L : eventRow.totalProfileViews()
        );
    }

    private List<InternalOpsAnalyticsResponse.CategoryPerformance> loadCategoryPerformance(MapSqlParameterSource params) {
        return jdbcTemplate.query(
            """
            SELECT
                COALESCE(NULLIF(b.service_category_slug_snapshot, ''), NULLIF(b.professional_rubro_snapshot, ''), 'sin-categoria') AS category_key,
                COALESCE(NULLIF(b.service_category_name_snapshot, ''), NULLIF(b.professional_rubro_snapshot, ''), 'Sin categoria') AS category_label,
                COUNT(*) AS total_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'CONFIRMED' THEN 1 ELSE 0 END), 0) AS confirmed_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completed_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS cancelled_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'NO_SHOW' THEN 1 ELSE 0 END), 0) AS no_show_bookings,
                COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED' THEN COALESCE(b.service_price_snapshot, 0) ELSE 0 END), 0) AS estimated_revenue,
                COALESCE(AVG(CASE WHEN b.status <> 'CANCELLED' THEN COALESCE(b.service_price_snapshot, 0) END), 0) AS average_ticket
            FROM booking b
            WHERE b.created_at >= :from AND b.created_at < :to
            GROUP BY 1, 2
            ORDER BY total_bookings DESC, estimated_revenue DESC, category_label ASC
            LIMIT 25
            """,
            params,
            (rs, rowNum) -> {
                long totalBookings = rs.getLong("total_bookings");
                long cancelledBookings = rs.getLong("cancelled_bookings");
                long noShowBookings = rs.getLong("no_show_bookings");
                return new InternalOpsAnalyticsResponse.CategoryPerformance(
                    rs.getString("category_key"),
                    rs.getString("category_label"),
                    totalBookings,
                    rs.getLong("pending_bookings"),
                    rs.getLong("confirmed_bookings"),
                    rs.getLong("completed_bookings"),
                    cancelledBookings,
                    noShowBookings,
                    roundRate(cancelledBookings, totalBookings),
                    roundRate(noShowBookings, totalBookings),
                    roundMoney(rs.getDouble("estimated_revenue")),
                    roundMoney(rs.getDouble("average_ticket"))
                );
            }
        );
    }

    private List<InternalOpsAnalyticsResponse.ServicePerformance> loadServicePerformance(MapSqlParameterSource params) {
        return jdbcTemplate.query(
            """
            SELECT
                b.service_id,
                COALESCE(NULLIF(b.service_name_snapshot, ''), 'Servicio sin nombre') AS service_name,
                COALESCE(NULLIF(b.service_category_name_snapshot, ''), NULLIF(b.professional_rubro_snapshot, ''), 'Sin categoria') AS category_label,
                COUNT(*) AS total_bookings,
                COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED' THEN COALESCE(b.service_price_snapshot, 0) ELSE 0 END), 0) AS estimated_revenue,
                COALESCE(AVG(CASE WHEN b.status <> 'CANCELLED' THEN COALESCE(b.service_price_snapshot, 0) END), 0) AS average_ticket
            FROM booking b
            WHERE b.created_at >= :from AND b.created_at < :to
            GROUP BY b.service_id, service_name, category_label
            ORDER BY total_bookings DESC, estimated_revenue DESC, service_name ASC
            LIMIT 20
            """,
            params,
            (rs, rowNum) -> new InternalOpsAnalyticsResponse.ServicePerformance(
                rs.getString("service_id"),
                rs.getString("service_name"),
                rs.getString("category_label"),
                rs.getLong("total_bookings"),
                roundMoney(rs.getDouble("estimated_revenue")),
                roundMoney(rs.getDouble("average_ticket"))
            )
        );
    }

    private List<InternalOpsAnalyticsResponse.FunnelByCategory> loadFunnelByCategory(MapSqlParameterSource params) {
        return jdbcTemplate.query(
            """
            WITH searches AS (
                SELECT
                    COALESCE(NULLIF(e.category_slug, ''), 'sin-categoria') AS category_key,
                    COALESCE(NULLIF(e.category_label, ''), NULLIF(e.category_slug, ''), 'Busqueda general') AS category_label,
                    COUNT(*) AS searches
                FROM app_product_event e
                WHERE e.event_key = 'SEARCH_PERFORMED'
                  AND e.occurred_at >= :from AND e.occurred_at < :to
                GROUP BY 1, 2
            ),
            profile_views AS (
                SELECT
                    COALESCE(NULLIF(e.category_slug, ''), 'sin-categoria') AS category_key,
                    COALESCE(NULLIF(e.category_label, ''), NULLIF(e.professional_rubro, ''), 'Sin categoria') AS category_label,
                    COUNT(*) AS profile_views
                FROM app_product_event e
                WHERE e.event_key = 'PROFESSIONAL_PROFILE_VIEWED'
                  AND e.occurred_at >= :from AND e.occurred_at < :to
                GROUP BY 1, 2
            ),
            reservations AS (
                SELECT
                    COALESCE(NULLIF(b.service_category_slug_snapshot, ''), NULLIF(b.professional_rubro_snapshot, ''), 'sin-categoria') AS category_key,
                    COALESCE(NULLIF(b.service_category_name_snapshot, ''), NULLIF(b.professional_rubro_snapshot, ''), 'Sin categoria') AS category_label,
                    COUNT(*) AS reservations
                FROM booking b
                WHERE b.created_at >= :from AND b.created_at < :to
                GROUP BY 1, 2
            ),
            all_keys AS (
                SELECT category_key, category_label FROM searches
                UNION
                SELECT category_key, category_label FROM profile_views
                UNION
                SELECT category_key, category_label FROM reservations
            )
            SELECT
                k.category_key,
                k.category_label,
                COALESCE(s.searches, 0) AS searches,
                COALESCE(p.profile_views, 0) AS profile_views,
                COALESCE(r.reservations, 0) AS reservations
            FROM all_keys k
            LEFT JOIN searches s ON s.category_key = k.category_key
            LEFT JOIN profile_views p ON p.category_key = k.category_key
            LEFT JOIN reservations r ON r.category_key = k.category_key
            ORDER BY reservations DESC, profile_views DESC, searches DESC, k.category_label ASC
            LIMIT 25
            """,
            params,
            (rs, rowNum) -> {
                long searches = rs.getLong("searches");
                long profileViews = rs.getLong("profile_views");
                long reservations = rs.getLong("reservations");
                return new InternalOpsAnalyticsResponse.FunnelByCategory(
                    rs.getString("category_key"),
                    rs.getString("category_label"),
                    searches,
                    profileViews,
                    reservations,
                    roundRate(profileViews, searches),
                    roundRate(reservations, profileViews),
                    roundRate(reservations, searches)
                );
            }
        );
    }

    private InternalOpsAnalyticsResponse.RetentionMetrics loadRetention(DateWindow window) {
        MapSqlParameterSource currentParams = baseParams(window.fromDateTime(), window.toDateTime());
        long windowDays = Math.max(1L, ChronoUnit.DAYS.between(window.fromDate(), window.toDateExclusive()));
        LocalDateTime previousFrom = window.fromDateTime().minusDays(windowDays);
        LocalDateTime previousTo = window.fromDateTime();
        MapSqlParameterSource previousParams = baseParams(previousFrom, previousTo);

        RetentionRow currentRow = jdbcTemplate.queryForObject(
            """
            WITH current_clients AS (
                SELECT DISTINCT b.user_id
                FROM booking b
                WHERE b.created_at >= :from AND b.created_at < :to
                  AND b.status <> 'CANCELLED'
            ),
            returning_clients AS (
                SELECT DISTINCT current_b.user_id
                FROM booking current_b
                WHERE current_b.created_at >= :from AND current_b.created_at < :to
                  AND current_b.status <> 'CANCELLED'
                  AND EXISTS (
                      SELECT 1
                      FROM booking history_b
                      WHERE history_b.user_id = current_b.user_id
                        AND history_b.created_at < :from
                        AND history_b.status <> 'CANCELLED'
                  )
            ),
            repeat_clients AS (
                SELECT b.user_id
                FROM booking b
                WHERE b.created_at >= :from AND b.created_at < :to
                  AND b.status <> 'CANCELLED'
                GROUP BY b.user_id
                HAVING COUNT(*) >= 2
            )
            SELECT
                (SELECT COUNT(*) FROM current_clients) AS active_clients,
                (SELECT COUNT(*) FROM returning_clients) AS returning_clients,
                (SELECT COUNT(*) FROM repeat_clients) AS repeat_clients
            """,
            currentParams,
            (rs, rowNum) -> new RetentionRow(
                rs.getLong("active_clients"),
                rs.getLong("returning_clients"),
                rs.getLong("repeat_clients")
            )
        );

        PreviousRetentionRow previousRow = jdbcTemplate.queryForObject(
            """
            WITH previous_clients AS (
                SELECT DISTINCT b.user_id
                FROM booking b
                WHERE b.created_at >= :from AND b.created_at < :to
                  AND b.status <> 'CANCELLED'
            ),
            retained_clients AS (
                SELECT DISTINCT prev.user_id
                FROM previous_clients prev
                JOIN booking current_b
                  ON current_b.user_id = prev.user_id
                 AND current_b.created_at >= :currentFrom
                 AND current_b.created_at < :currentTo
                 AND current_b.status <> 'CANCELLED'
            )
            SELECT
                (SELECT COUNT(*) FROM previous_clients) AS previous_clients,
                (SELECT COUNT(*) FROM retained_clients) AS retained_clients
            """,
            previousParams
                .addValue("currentFrom", Timestamp.valueOf(window.fromDateTime()))
                .addValue("currentTo", Timestamp.valueOf(window.toDateTime())),
            (rs, rowNum) -> new PreviousRetentionRow(
                rs.getLong("previous_clients"),
                rs.getLong("retained_clients")
            )
        );

        long activeClients = currentRow == null ? 0L : currentRow.activeClients();
        long returningClients = currentRow == null ? 0L : currentRow.returningClients();
        long repeatClients = currentRow == null ? 0L : currentRow.repeatClients();
        long previousClients = previousRow == null ? 0L : previousRow.previousClients();
        long retainedClients = previousRow == null ? 0L : previousRow.retainedClients();

        return new InternalOpsAnalyticsResponse.RetentionMetrics(
            activeClients,
            returningClients,
            roundRate(returningClients, activeClients),
            repeatClients,
            roundRate(repeatClients, activeClients),
            previousClients,
            retainedClients,
            roundRate(retainedClients, previousClients)
        );
    }

    private List<InternalOpsAnalyticsResponse.DemandPoint> loadDemandByWeekday(MapSqlParameterSource params) {
        Map<Integer, String> labels = new LinkedHashMap<>();
        labels.put(1, "Lunes");
        labels.put(2, "Martes");
        labels.put(3, "Miercoles");
        labels.put(4, "Jueves");
        labels.put(5, "Viernes");
        labels.put(6, "Sabado");
        labels.put(0, "Domingo");

        return jdbcTemplate.query(
            """
            SELECT EXTRACT(DOW FROM b.start_date_time)::int AS dow, COUNT(*) AS total_bookings
            FROM booking b
            WHERE b.start_date_time >= :from AND b.start_date_time < :to
              AND b.status <> 'CANCELLED'
            GROUP BY dow
            ORDER BY CASE EXTRACT(DOW FROM b.start_date_time)::int
                WHEN 1 THEN 1
                WHEN 2 THEN 2
                WHEN 3 THEN 3
                WHEN 4 THEN 4
                WHEN 5 THEN 5
                WHEN 6 THEN 6
                ELSE 7
            END
            """,
            params,
            (rs, rowNum) -> new InternalOpsAnalyticsResponse.DemandPoint(
                labels.getOrDefault(rs.getInt("dow"), "Sin dia"),
                rs.getLong("total_bookings")
            )
        );
    }

    private List<InternalOpsAnalyticsResponse.DemandPoint> loadDemandByHour(MapSqlParameterSource params) {
        return jdbcTemplate.query(
            """
            SELECT EXTRACT(HOUR FROM b.start_date_time)::int AS hour_value, COUNT(*) AS total_bookings
            FROM booking b
            WHERE b.start_date_time >= :from AND b.start_date_time < :to
              AND b.status <> 'CANCELLED'
            GROUP BY hour_value
            ORDER BY total_bookings DESC, hour_value ASC
            LIMIT 24
            """,
            params,
            (rs, rowNum) -> new InternalOpsAnalyticsResponse.DemandPoint(
                String.format(Locale.ROOT, "%02d:00", rs.getInt("hour_value")),
                rs.getLong("total_bookings")
            )
        );
    }

    private List<InternalOpsAnalyticsResponse.CityPerformance> loadCityPerformance(MapSqlParameterSource params) {
        return jdbcTemplate.query(
            """
            WITH searches AS (
                SELECT COALESCE(NULLIF(e.city, ''), 'Sin ciudad') AS city, COUNT(*) AS searches
                FROM app_product_event e
                WHERE e.event_key = 'SEARCH_PERFORMED'
                  AND e.occurred_at >= :from AND e.occurred_at < :to
                GROUP BY 1
            ),
            profile_views AS (
                SELECT COALESCE(NULLIF(e.city, ''), 'Sin ciudad') AS city, COUNT(*) AS profile_views
                FROM app_product_event e
                WHERE e.event_key = 'PROFESSIONAL_PROFILE_VIEWED'
                  AND e.occurred_at >= :from AND e.occurred_at < :to
                GROUP BY 1
            ),
            reservations AS (
                SELECT
                    COALESCE(
                        NULLIF(b.professional_city_snapshot, ''),
                        NULLIF(b.professional_location_snapshot, ''),
                        'Sin ciudad'
                    ) AS city,
                    COUNT(*) AS reservations
                FROM booking b
                WHERE b.created_at >= :from AND b.created_at < :to
                GROUP BY 1
            ),
            all_keys AS (
                SELECT city FROM searches
                UNION
                SELECT city FROM profile_views
                UNION
                SELECT city FROM reservations
            )
            SELECT
                k.city,
                COALESCE(s.searches, 0) AS searches,
                COALESCE(p.profile_views, 0) AS profile_views,
                COALESCE(r.reservations, 0) AS reservations
            FROM all_keys k
            LEFT JOIN searches s ON s.city = k.city
            LEFT JOIN profile_views p ON p.city = k.city
            LEFT JOIN reservations r ON r.city = k.city
            ORDER BY reservations DESC, profile_views DESC, searches DESC, k.city ASC
            LIMIT 20
            """,
            params,
            (rs, rowNum) -> {
                long searches = rs.getLong("searches");
                long profileViews = rs.getLong("profile_views");
                long reservations = rs.getLong("reservations");
                return new InternalOpsAnalyticsResponse.CityPerformance(
                    rs.getString("city"),
                    searches,
                    profileViews,
                    reservations,
                    roundRate(reservations, profileViews),
                    roundRate(reservations, searches)
                );
            }
        );
    }

    private List<InternalOpsAnalyticsResponse.ProfessionalPerformance> loadProfessionalPerformance(MapSqlParameterSource params) {
        return jdbcTemplate.query(
            """
            WITH booking_metrics AS (
                SELECT
                    b.professional_id,
                    COUNT(*) AS total_bookings,
                    COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED' THEN COALESCE(b.service_price_snapshot, 0) ELSE 0 END), 0) AS estimated_revenue,
                    COALESCE(AVG(CASE WHEN b.status <> 'CANCELLED' THEN COALESCE(b.service_price_snapshot, 0) END), 0) AS average_ticket,
                    MAX(COALESCE(NULLIF(b.service_category_name_snapshot, ''), NULLIF(b.professional_rubro_snapshot, ''), 'Sin categoria')) AS category_label,
                    MAX(COALESCE(NULLIF(b.professional_city_snapshot, ''), NULLIF(b.professional_location_snapshot, ''), 'Sin ciudad')) AS city
                FROM booking b
                WHERE b.created_at >= :from AND b.created_at < :to
                GROUP BY b.professional_id
            ),
            occupancy AS (
                SELECT
                    slot.professional_id,
                    CASE
                        WHEN COUNT(*) = 0 THEN 0
                        ELSE (100.0 * SUM(CASE WHEN slot.status = 'BOOKED' THEN 1 ELSE 0 END) / COUNT(*))
                    END AS occupancy_rate
                FROM available_slot slot
                WHERE slot.start_at >= :from AND slot.start_at < :to
                GROUP BY slot.professional_id
            )
            SELECT
                p.id AS professional_id,
                COALESCE(NULLIF(p.display_name, ''), u.full_name) AS professional_name,
                COALESCE(p.slug, '') AS professional_slug,
                COALESCE(bm.category_label, NULLIF(p.rubro, ''), 'Sin categoria') AS category_label,
                COALESCE(bm.city, NULLIF(p.city, ''), NULLIF(p.location, ''), 'Sin ciudad') AS city,
                COALESCE(bm.total_bookings, 0) AS total_bookings,
                COALESCE(bm.estimated_revenue, 0) AS estimated_revenue,
                COALESCE(bm.average_ticket, 0) AS average_ticket,
                COALESCE(o.occupancy_rate, 0) AS occupancy_rate,
                COALESCE(p.rating, 0) AS rating,
                COALESCE(p.reviews_count, 0) AS reviews_count
            FROM booking_metrics bm
            JOIN professional_profile p ON p.id = bm.professional_id
            JOIN app_user u ON u.id = p.user_id
            LEFT JOIN occupancy o ON o.professional_id = p.id
            ORDER BY total_bookings DESC, estimated_revenue DESC, professional_name ASC
            LIMIT 20
            """,
            params,
            (rs, rowNum) -> new InternalOpsAnalyticsResponse.ProfessionalPerformance(
                rs.getLong("professional_id"),
                rs.getString("professional_name"),
                rs.getString("professional_slug"),
                rs.getString("category_label"),
                rs.getString("city"),
                rs.getLong("total_bookings"),
                roundMoney(rs.getDouble("estimated_revenue")),
                roundMoney(rs.getDouble("average_ticket")),
                roundRate(rs.getDouble("occupancy_rate")),
                roundRate(rs.getDouble("rating")),
                rs.getLong("reviews_count")
            )
        );
    }

    private MapSqlParameterSource baseParams(LocalDateTime from, LocalDateTime to) {
        return new MapSqlParameterSource()
            .addValue("from", Timestamp.valueOf(from))
            .addValue("to", Timestamp.valueOf(to));
    }

    private DateWindow resolveDateWindow(String from, String to) {
        LocalDate fromDate = parseDate(from);
        LocalDate toDateInclusive = parseDate(to);
        LocalDate today = LocalDate.now();

        if (fromDate == null && toDateInclusive == null) {
            fromDate = today.minusDays(29);
            toDateInclusive = today;
        } else if (fromDate == null) {
            toDateInclusive = toDateInclusive == null ? today : toDateInclusive;
            fromDate = toDateInclusive.minusDays(29);
        } else if (toDateInclusive == null) {
            toDateInclusive = today;
        }

        if (toDateInclusive.isBefore(fromDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rango de fechas es invalido");
        }

        return new DateWindow(fromDate, toDateInclusive.plusDays(1));
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha invalida: " + value);
        }
    }

    private double roundMoney(double value) {
        return Math.round(value * 100.0d) / 100.0d;
    }

    private double roundRate(long numerator, long denominator) {
        if (denominator <= 0 || numerator <= 0) {
            return 0d;
        }
        return roundRate((numerator * 100.0d) / denominator);
    }

    private double roundRate(double value) {
        return Math.round(value * 100.0d) / 100.0d;
    }

    private record DateWindow(
        LocalDate fromDate,
        LocalDate toDateExclusive
    ) {
        LocalDateTime fromDateTime() {
            return fromDate.atStartOfDay();
        }

        LocalDateTime toDateTime() {
            return toDateExclusive.atStartOfDay();
        }
    }

    private record OverviewRow(
        long totalReservations,
        long completedReservations,
        long cancelledReservations,
        long noShowReservations,
        double estimatedRevenue,
        double averageTicket
    ) {
    }

    private record EventOverviewRow(
        long totalSearches,
        long totalProfileViews
    ) {
    }

    private record RetentionRow(
        long activeClients,
        long returningClients,
        long repeatClients
    ) {
    }

    private record PreviousRetentionRow(
        long previousClients,
        long retainedClients
    ) {
    }
}

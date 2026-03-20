package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationSeverity;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class NotificationInboxReadRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    NotificationInboxReadRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    NotificationInboxPageView listInbox(NotificationInboxQuery query) {
        MapSqlParameterSource params = new MapSqlParameterSource()
            .addValue("recipientType", query.recipientType().name())
            .addValue("recipientId", query.recipientId())
            .addValue("offset", (long) query.page() * query.size())
            .addValue("limit", query.size());

        String bookingIdExpression =
            "COALESCE("
                + "e.booking_reference_id, "
                + "CASE "
                + "  WHEN e.aggregate_type = 'BOOKING' AND e.aggregate_id ~ '^[0-9]+$' THEN e.aggregate_id::bigint "
                + "  ELSE NULL "
                + "END"
                + ")";

        StringBuilder where = new StringBuilder(
            " WHERE n.recipient_type = :recipientType AND n.recipient_id = :recipientId"
        );

        if (query.status() == NotificationInboxStatus.UNREAD) {
            where.append(" AND n.read_at IS NULL");
        } else if (query.status() == NotificationInboxStatus.READ) {
            where.append(" AND n.read_at IS NOT NULL");
        }

        if (query.types() != null && !query.types().isEmpty()) {
            params.addValue("types", query.types().stream().map(NotificationEventType::name).toList());
            where.append(" AND e.event_type IN (:types)");
        }

        if (query.bookingId() != null) {
            params.addValue("bookingId", query.bookingId());
            params.addValue("bookingPayloadPattern", "%\"bookingId\":" + query.bookingId() + "%");
            where.append(" AND (")
                .append(bookingIdExpression).append(" = :bookingId")
                .append(" OR (e.booking_reference_id IS NULL AND e.payload_json LIKE :bookingPayloadPattern)")
                .append(")");
        }

        if (query.from() != null) {
            params.addValue("from", Timestamp.valueOf(query.from()));
            where.append(" AND n.created_at >= :from");
        }
        if (query.to() != null) {
            params.addValue("to", Timestamp.valueOf(query.to()));
            where.append(" AND n.created_at <= :to");
        }

        String baseFrom =
            " FROM app_notification n "
                + "JOIN notification_event e ON e.id = n.notification_event_id";
        String selectSql =
            "SELECT "
                + "n.id, "
                + "e.event_type, "
                + "n.title, "
                + "n.body, "
                + "n.severity, "
                + "n.category, "
                + "n.created_at, "
                + "n.read_at, "
                + bookingIdExpression + " AS booking_id, "
                + "n.action_url "
                + baseFrom
                + where
                + " ORDER BY n.created_at DESC LIMIT :limit OFFSET :offset";
        String countSql = "SELECT COUNT(*)" + baseFrom + where;

        Long total = jdbcTemplate.queryForObject(countSql, params, Long.class);
        List<NotificationInboxItemView> items = jdbcTemplate.query(selectSql, params, (rs, rowNum) ->
            new NotificationInboxItemView(
                rs.getString("id"),
                NotificationEventType.valueOf(rs.getString("event_type")),
                rs.getString("title"),
                rs.getString("body"),
                NotificationSeverity.valueOf(rs.getString("severity")),
                rs.getString("category"),
                toLocalDateTime(rs.getTimestamp("created_at")),
                toLocalDateTime(rs.getTimestamp("read_at")),
                rs.getObject("booking_id") == null ? null : rs.getLong("booking_id"),
                rs.getString("action_url")
            )
        );

        return new NotificationInboxPageView(
            query.page(),
            query.size(),
            total == null ? 0L : total,
            new ArrayList<>(items)
        );
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}

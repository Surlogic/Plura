package com.plura.plurabackend.core.observability.repository;

import com.plura.plurabackend.core.observability.model.AppErrorIncident;
import com.plura.plurabackend.core.observability.model.AppErrorSeverity;
import com.plura.plurabackend.core.observability.model.AppErrorSource;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppErrorIncidentRepository extends JpaRepository<AppErrorIncident, Long> {

    Optional<AppErrorIncident> findByFingerprint(String fingerprint);

    @Query(
        value = """
            SELECT incident
            FROM AppErrorIncident incident
            WHERE (:source IS NULL OR incident.source = :source)
              AND (:severity IS NULL OR incident.severity = :severity)
              AND (:resolved IS NULL OR (:resolved = TRUE AND incident.resolvedAt IS NOT NULL) OR (:resolved = FALSE AND incident.resolvedAt IS NULL))
              AND (:from IS NULL OR incident.lastSeenAt >= :from)
              AND (:to IS NULL OR incident.lastSeenAt < :to)
            ORDER BY CASE WHEN incident.resolvedAt IS NULL THEN 0 ELSE 1 END ASC, incident.lastSeenAt DESC, incident.id DESC
            """,
        countQuery = """
            SELECT COUNT(incident)
            FROM AppErrorIncident incident
            WHERE (:source IS NULL OR incident.source = :source)
              AND (:severity IS NULL OR incident.severity = :severity)
              AND (:resolved IS NULL OR (:resolved = TRUE AND incident.resolvedAt IS NOT NULL) OR (:resolved = FALSE AND incident.resolvedAt IS NULL))
              AND (:from IS NULL OR incident.lastSeenAt >= :from)
              AND (:to IS NULL OR incident.lastSeenAt < :to)
            """
    )
    Page<AppErrorIncident> findAllFiltered(
        @Param("source") AppErrorSource source,
        @Param("severity") AppErrorSeverity severity,
        @Param("resolved") Boolean resolved,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to,
        Pageable pageable
    );

    @Query("SELECT COUNT(incident) FROM AppErrorIncident incident WHERE incident.resolvedAt IS NULL")
    long countOpenIncidents();

    @Query("SELECT COUNT(incident) FROM AppErrorIncident incident WHERE (:from IS NULL OR incident.lastSeenAt >= :from) AND (:to IS NULL OR incident.lastSeenAt < :to)")
    long countSeenInRange(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT incident.source, COUNT(incident) FROM AppErrorIncident incident WHERE (:from IS NULL OR incident.lastSeenAt >= :from) AND (:to IS NULL OR incident.lastSeenAt < :to) GROUP BY incident.source ORDER BY incident.source")
    List<Object[]> countBySource(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT incident.severity, COUNT(incident) FROM AppErrorIncident incident WHERE (:from IS NULL OR incident.lastSeenAt >= :from) AND (:to IS NULL OR incident.lastSeenAt < :to) GROUP BY incident.severity ORDER BY incident.severity")
    List<Object[]> countBySeverity(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}

package com.plura.plurabackend.core.observability.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "app_error_incident",
    indexes = {
        @Index(name = "idx_app_error_incident_last_seen", columnList = "last_seen_at DESC"),
        @Index(name = "idx_app_error_incident_open_last_seen", columnList = "resolved_at, last_seen_at DESC"),
        @Index(name = "idx_app_error_incident_source_last_seen", columnList = "source, last_seen_at DESC")
    }
)
public class AppErrorIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fingerprint", nullable = false, unique = true, length = 128)
    private String fingerprint;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 20)
    private AppErrorSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private AppErrorSeverity severity = AppErrorSeverity.ERROR;

    @Column(name = "error_type", length = 255)
    private String errorType;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "stack_trace", columnDefinition = "TEXT")
    private String stackTrace;

    @Column(name = "route", length = 512)
    private String route;

    @Column(name = "http_method", length = 16)
    private String httpMethod;

    @Column(name = "http_status")
    private Integer httpStatus;

    @Column(name = "trace_id", length = 128)
    private String traceId;

    @Column(name = "client_session_id", length = 128)
    private String clientSessionId;

    @Column(name = "context_json", columnDefinition = "TEXT")
    private String contextJson;

    @Column(name = "occurrence_count", nullable = false)
    private Long occurrenceCount = 1L;

    @Column(name = "first_seen_at", nullable = false)
    private LocalDateTime firstSeenAt;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.firstSeenAt == null) {
            this.firstSeenAt = now;
        }
        if (this.lastSeenAt == null) {
            this.lastSeenAt = this.firstSeenAt;
        }
        if (this.occurrenceCount == null || this.occurrenceCount < 1) {
            this.occurrenceCount = 1L;
        }
        if (this.severity == null) {
            this.severity = AppErrorSeverity.ERROR;
        }
    }

    @PreUpdate
    void onUpdate() {
        if (this.lastSeenAt == null) {
            this.lastSeenAt = LocalDateTime.now();
        }
    }
}

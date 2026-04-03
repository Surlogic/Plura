package com.plura.plurabackend.core.analytics.tracking.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "app_product_event")
public class AppProductEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_key", nullable = false, length = 50)
    private String eventKey;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "platform", nullable = false, length = 20)
    private String platform;

    @Column(name = "source_surface", length = 50)
    private String sourceSurface;

    @Column(name = "search_type", length = 30)
    private String searchType;

    @Column(name = "query_text", length = 255)
    private String queryText;

    @Column(name = "category_slug", length = 120)
    private String categorySlug;

    @Column(name = "category_label", length = 255)
    private String categoryLabel;

    @Column(name = "professional_id")
    private Long professionalId;

    @Column(name = "professional_slug", length = 255)
    private String professionalSlug;

    @Column(name = "professional_rubro", length = 255)
    private String professionalRubro;

    @Column(name = "service_id", length = 36)
    private String serviceId;

    @Column(name = "city", length = 255)
    private String city;

    @Column(name = "country", length = 255)
    private String country;

    @Column(name = "result_count")
    private Integer resultCount;

    @Column(name = "metadata_json", columnDefinition = "text")
    private String metadataJson;

    @PrePersist
    void onCreate() {
        if (occurredAt == null) {
            occurredAt = LocalDateTime.now();
        }
        if (platform == null || platform.isBlank()) {
            platform = "UNKNOWN";
        }
    }
}

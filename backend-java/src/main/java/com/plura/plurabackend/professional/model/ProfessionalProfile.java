package com.plura.plurabackend.professional.model;

import com.plura.plurabackend.core.category.model.Category;
import com.plura.plurabackend.core.user.model.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "professional_profile")
public class ProfessionalProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private String rubro;

    @Column(name = "display_name")
    private String displayName;

    @Column(unique = true)
    private String slug;

    @Column(name = "public_headline")
    private String publicHeadline;

    @Column(name = "public_about", columnDefinition = "text")
    private String publicAbout;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "instagram")
    private String instagram;

    @Column(name = "facebook")
    private String facebook;

    @Column(name = "tiktok")
    private String tiktok;

    @Column(name = "website")
    private String website;

    @Column(name = "whatsapp")
    private String whatsapp;

    @ElementCollection
    @CollectionTable(
        name = "professional_profile_photos",
        joinColumns = @JoinColumn(name = "professional_id")
    )
    @Column(name = "url")
    @OrderColumn(name = "position")
    private List<String> publicPhotos = new ArrayList<>();

    @Column
    private String location;

    @Column(name = "country")
    private String country;

    @Column(name = "city")
    private String city;

    @Column(name = "full_address")
    private String fullAddress;

    @Column(name = "location_text")
    private String locationText;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "rating", nullable = false)
    private Double rating = 0d;

    @Column(name = "reviews_count", nullable = false)
    private Integer reviewsCount = 0;

    @Column(name = "tipo_cliente")
    private String tipoCliente;

    @Column(name = "schedule_json", columnDefinition = "text")
    private String scheduleJson;

    @Column(name = "slot_duration_minutes", nullable = false)
    private Integer slotDurationMinutes = 15;

    @Column(name = "has_availability_today", nullable = false)
    private Boolean hasAvailabilityToday = false;

    @Column(name = "next_available_at")
    private LocalDateTime nextAvailableAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "professional_categories",
        joinColumns = @JoinColumn(name = "professional_id"),
        inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<Category> categories = new HashSet<>();

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.active == null) {
            this.active = true;
        }
        if (this.rating == null) {
            this.rating = 0d;
        }
        if (this.reviewsCount == null) {
            this.reviewsCount = 0;
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.slotDurationMinutes == null) {
            this.slotDurationMinutes = 15;
        }
        if (this.hasAvailabilityToday == null) {
            this.hasAvailabilityToday = false;
        }
    }
}

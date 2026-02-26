package com.plura.plurabackend.professional.model;

import com.plura.plurabackend.user.model.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    @Column(unique = true)
    private String slug;

    @Column(name = "public_headline")
    private String publicHeadline;

    @Column(name = "public_about", columnDefinition = "text")
    private String publicAbout;

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

    @Column(name = "tipo_cliente")
    private String tipoCliente;

    @Column(name = "schedule_json", columnDefinition = "text")
    private String scheduleJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}

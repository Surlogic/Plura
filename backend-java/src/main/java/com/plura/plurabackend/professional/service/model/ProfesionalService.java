package com.plura.plurabackend.professional.service.model;

import com.plura.plurabackend.booking.model.ServicePaymentType;
import com.plura.plurabackend.category.model.Category;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "professional_service")
public class ProfesionalService {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "professional_id", nullable = false)
    private ProfessionalProfile professional;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(nullable = false)
    private String name;

    @Column(length = 200)
    private String description;

    @Column(nullable = false)
    private String price;

    @Column(nullable = false)
    private String duration;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "post_buffer_minutes")
    private Integer postBufferMinutes = 0;

    @Column(name = "deposit_amount", precision = 12, scale = 2)
    private BigDecimal depositAmount;

    @Column(nullable = false, length = 10)
    private String currency = "UYU";

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false, length = 20)
    private ServicePaymentType paymentType = ServicePaymentType.ON_SITE;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.id == null || this.id.isBlank()) {
            this.id = java.util.UUID.randomUUID().toString();
        }
        if (this.active == null) {
            this.active = true;
        }
        if (this.postBufferMinutes == null || this.postBufferMinutes < 0) {
            this.postBufferMinutes = 0;
        }
        if (this.paymentType == null) {
            this.paymentType = ServicePaymentType.ON_SITE;
        }
        if (this.currency == null || this.currency.isBlank()) {
            this.currency = "UYU";
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}

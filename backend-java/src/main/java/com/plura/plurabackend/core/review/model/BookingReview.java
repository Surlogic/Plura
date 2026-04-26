package com.plura.plurabackend.core.review.model;

import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.core.user.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "booking_review",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_booking_review_booking", columnNames = {"booking_id"})
    },
    indexes = {
        @Index(name = "idx_booking_review_professional_created_at", columnList = "professional_id, created_at")
    }
)
public class BookingReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "professional_id", nullable = false)
    private ProfessionalProfile professional;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Column(name = "review_text", columnDefinition = "text")
    private String reviewText;

    @Column(name = "text_hidden_by_professional", nullable = false)
    private Boolean textHiddenByProfessional = false;

    @Column(name = "text_hidden_at")
    private LocalDateTime textHiddenAt;

    @Column(name = "text_hidden_by_internal_ops", nullable = false)
    private Boolean textHiddenByInternalOps = false;

    @Column(name = "internal_moderation_note", columnDefinition = "text")
    private String internalModerationNote;

    @Column(name = "business_reply_text", columnDefinition = "text")
    private String businessReplyText;

    @Column(name = "business_replied_at")
    private LocalDateTime businessRepliedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_replied_by_user_id")
    private User businessRepliedByUser;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = this.createdAt;
        }
        if (this.version == null) {
            this.version = 0L;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

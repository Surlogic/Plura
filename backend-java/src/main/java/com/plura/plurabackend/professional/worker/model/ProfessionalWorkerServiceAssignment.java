package com.plura.plurabackend.professional.worker.model;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

/**
 * ProfessionalWorkerServiceAssignment es un entidad JPA del modulo profesionales / trabajadores / modelo.
 * Responsabilidad: representar una tabla del dominio, sus columnas y los defaults necesarios antes de persistir.
 * Persistencia: sus campos reflejan columnas reales; cambiar nombres o tipos puede requerir migracion Flyway.
 * Foco funcional: profesionales, servicios, trabajadores.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "professional_worker_service")
public class ProfessionalWorkerServiceAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "worker_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ProfessionalWorker worker;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "professional_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ProfessionalProfile professional;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ProfesionalService service;

    @Column(nullable = false)
    private Boolean active;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.active == null) {
            this.active = true;
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}

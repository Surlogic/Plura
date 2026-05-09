package com.plura.plurabackend.core.category.model;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Category es un entidad JPA del modulo categorias / modelo.
 * Responsabilidad: representar una tabla del dominio, sus columnas y los defaults necesarios antes de persistir.
 * Persistencia: sus campos reflejan columnas reales; cambiar nombres o tipos puede requerir migracion Flyway.
 * Foco funcional: categorias.
 */
@Getter
@Setter
@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(nullable = false)
    private Boolean active = true;

    @ManyToMany(mappedBy = "categories", fetch = FetchType.LAZY)
    private Set<ProfessionalProfile> professionals = new HashSet<>();
}

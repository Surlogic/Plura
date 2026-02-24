package com.plura.plurabackend.users.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Id;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "user_profesional")
public class UserProfesional {

    // Tabla física: user_profesional.
    // ID externo tipo UUID (string).
    @Id
    @Column(nullable = false, length = 36)
    private String id;

    // Nombre visible del profesional/empresa.
    @Column(name = "full_name", nullable = false)
    private String fullName;

    // Rubro principal.
    @Column(nullable = false)
    private String rubro;

    // Slug público (genera la URL de la página pública).
    @Column(name = "slug", unique = true)
    private String slug;

    // Frase principal visible en la página pública.
    @Column(name = "public_headline")
    private String publicHeadline;

    // Descripción "Sobre mí".
    @Column(name = "public_about", columnDefinition = "text")
    private String publicAbout;

    // Fotos públicas del negocio o trabajos.
    @ElementCollection
    @CollectionTable(
        name = "user_profesional_photos",
        joinColumns = @JoinColumn(name = "profesional_id")
    )
    @Column(name = "url")
    @OrderColumn(name = "position")
    private List<String> publicPhotos = new ArrayList<>();

    // Email único de login.
    @Column(nullable = false, unique = true)
    private String email;

    // Teléfono de contacto.
    @Column(name = "phone_number", nullable = false)
    private String phoneNumber;

    // Ubicación del local (si aplica).
    @Column
    private String location;

    // Tipo de cliente (con o sin local).
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_cliente", nullable = false)
    private TipoCliente tipoCliente;

    // Hash de la contraseña (nunca exponer en JSON).
    @Column(nullable = false)
    @JsonIgnore
    private String password;

    // Timestamp de creación.
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        // Genera ID y fecha si no se asignaron explícitamente.
        if (this.id == null || this.id.isBlank()) {
            this.id = java.util.UUID.randomUUID().toString();
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}

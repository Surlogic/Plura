package com.plura.plurabackend.users.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Id;
import jakarta.persistence.Enumerated;
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
    @Column(nullable = false)
    private String fullName;

    // Rubro principal.
    @Column(nullable = false)
    private String rubro;

    // Email único de login.
    @Column(nullable = false, unique = true)
    private String email;

    // Teléfono de contacto.
    @Column(nullable = false)
    private String phoneNumber;

    // Ubicación del local (si aplica).
    @Column
    private String location;

    // Tipo de cliente (con o sin local).
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoCliente tipoCliente;

    // Hash de la contraseña (nunca exponer en JSON).
    @Column(nullable = false)
    @JsonIgnore
    private String password;

    // Timestamp de creación.
    @Column(nullable = false)
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

package com.plura.plurabackend.users.repository;

import java.util.Optional;
import com.plura.plurabackend.users.model.UserProfesional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfesionalRepository extends JpaRepository<UserProfesional, String> {
    // Búsqueda por email para validar duplicados.
    Optional<UserProfesional> findByEmail(String email);

    Optional<UserProfesional> findBySlug(String slug);

    boolean existsBySlug(String slug);
}

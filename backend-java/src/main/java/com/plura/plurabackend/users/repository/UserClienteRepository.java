package com.plura.plurabackend.users.repository;

import java.util.Optional;
import com.plura.plurabackend.users.model.UserCliente;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserClienteRepository extends JpaRepository<UserCliente, String> {
    // Búsqueda por email para validar duplicados.
    Optional<UserCliente> findByEmail(String email);
}

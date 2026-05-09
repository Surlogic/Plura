package com.plura.plurabackend.core.booking.policy.repository;

import com.plura.plurabackend.core.booking.policy.model.BookingPolicy;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * BookingPolicyRepository es un contrato interno del modulo reservas / politicas / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: reservas.
 */
public interface BookingPolicyRepository extends JpaRepository<BookingPolicy, String> {
    Optional<BookingPolicy> findByProfessionalId(Long professionalId);
}

package com.plura.plurabackend.core.booking;

import java.util.Optional;

/**
 * ProfessionalActorLookupGateway es un contrato interno del modulo reservas.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales.
 */
public interface ProfessionalActorLookupGateway {

    Optional<Long> findProfessionalIdByUserId(Long userId);
}

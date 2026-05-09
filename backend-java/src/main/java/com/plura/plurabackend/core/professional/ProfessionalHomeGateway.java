package com.plura.plurabackend.core.professional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * ProfessionalHomeGateway es un contrato interno del modulo profesionales.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, home publica.
 */
public interface ProfessionalHomeGateway {

    long countActiveProfessionals();

    Map<UUID, Long> countActiveProfessionalsGroupedByCategoryIds(Collection<UUID> categoryIds);

    List<ProfessionalHomeProfileView> findTopActiveProfilesByIds(Collection<Long> ids);

    List<ProfessionalHomeProfileView> findRecentActiveProfiles(int page, int size);
}

package com.plura.plurabackend.core.professional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * ProfessionalAvailabilityGateway es un contrato interno del modulo profesionales.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, disponibilidad.
 */
public interface ProfessionalAvailabilityGateway {

    List<Long> findActiveProfessionalIdsPage(int page, int size);

    Optional<ProfessionalAvailabilityProfileView> findActiveProfessionalById(Long professionalId);

    List<ProfessionalAvailabilityProfileView> findActiveProfessionalsByIds(Collection<Long> professionalIds);

    List<ProfessionalServiceAvailabilityView> findActiveServicesByProfessionalId(Long professionalId);

    Map<Long, List<ProfessionalServiceAvailabilityView>> findActiveServicesByProfessionalIds(Collection<Long> professionalIds);

    void updateAvailabilitySummary(Long professionalId, boolean hasAvailabilityToday, LocalDateTime nextAvailableAt);

    void updateHasAvailabilityToday(Long professionalId, boolean hasAvailabilityToday);

    long countActiveProfessionals();

    long countActiveProfessionalsWithNextAvailableAtNull();
}

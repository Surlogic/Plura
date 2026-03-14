package com.plura.plurabackend.core.professional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface ProfessionalAvailabilityGateway {

    List<Long> findActiveProfessionalIdsPage(int page, int size);

    Optional<ProfessionalAvailabilityProfileView> findActiveProfessionalById(Long professionalId);

    List<ProfessionalServiceAvailabilityView> findActiveServicesByProfessionalId(Long professionalId);

    Map<Long, List<ProfessionalServiceAvailabilityView>> findActiveServicesByProfessionalIds(Collection<Long> professionalIds);

    void updateAvailabilitySummary(Long professionalId, boolean hasAvailabilityToday, LocalDateTime nextAvailableAt);

    void updateHasAvailabilityToday(Long professionalId, boolean hasAvailabilityToday);

    long countActiveProfessionals();

    long countActiveProfessionalsWithNextAvailableAtNull();
}

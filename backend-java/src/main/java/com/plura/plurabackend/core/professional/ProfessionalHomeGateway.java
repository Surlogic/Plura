package com.plura.plurabackend.core.professional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface ProfessionalHomeGateway {

    long countActiveProfessionals();

    Map<UUID, Long> countActiveProfessionalsGroupedByCategoryIds(Collection<UUID> categoryIds);

    List<ProfessionalHomeProfileView> findTopActiveProfilesByIds(Collection<Long> ids);

    List<ProfessionalHomeProfileView> findRecentActiveProfiles(int page, int size);
}

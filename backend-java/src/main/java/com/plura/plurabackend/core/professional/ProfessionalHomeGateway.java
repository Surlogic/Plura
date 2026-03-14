package com.plura.plurabackend.core.professional;

import java.util.Collection;
import java.util.List;

public interface ProfessionalHomeGateway {

    long countActiveProfessionals();

    List<ProfessionalHomeProfileView> findTopActiveProfilesByIds(Collection<Long> ids);

    List<ProfessionalHomeProfileView> findRecentActiveProfiles(int page, int size);
}

package com.plura.plurabackend.core.professional;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;

public interface ProfessionalPublicReadFacade {

    Optional<ProfessionalPublicSummary> findActiveSummaryBySlug(String slug);

    Map<Long, ProfessionalPublicSummary> findActiveSummariesByIds(Collection<Long> ids);

    Optional<Long> findActiveProfessionalIdBySlug(String slug);
}

package com.plura.plurabackend.core.professional;

import java.util.Collection;
import java.util.List;
import java.util.Map;

public interface ProfessionalSearchIndexGateway {

    List<ProfessionalSearchIndexProfileView> findActiveProfilesByIds(Collection<Long> ids);

    List<ProfessionalSearchIndexProfileView> findActiveProfilesPage(int page, int size);

    Map<Long, List<String>> findActiveServiceNamesByProfessionalIds(Collection<Long> ids);
}

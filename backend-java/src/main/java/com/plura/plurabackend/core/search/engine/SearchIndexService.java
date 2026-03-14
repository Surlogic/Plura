package com.plura.plurabackend.core.search.engine;

import com.plura.plurabackend.core.professional.ProfessionalSearchIndexGateway;
import com.plura.plurabackend.core.professional.ProfessionalSearchIndexProfileView;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class SearchIndexService {

    private final ProfessionalSearchIndexGateway professionalSearchIndexGateway;

    public SearchIndexService(ProfessionalSearchIndexGateway professionalSearchIndexGateway) {
        this.professionalSearchIndexGateway = professionalSearchIndexGateway;
    }

    public List<SearchIndexDocument> buildDocumentsByProfessionalIds(Collection<Long> professionalIds) {
        if (professionalIds == null || professionalIds.isEmpty()) {
            return List.of();
        }

        List<ProfessionalSearchIndexProfileView> profiles = professionalSearchIndexGateway.findActiveProfilesByIds(professionalIds);
        return mapDocuments(profiles);
    }

    public List<SearchIndexDocument> buildDocumentsPage(int page, int size) {
        List<ProfessionalSearchIndexProfileView> profiles = professionalSearchIndexGateway.findActiveProfilesPage(page, size);
        return mapDocuments(profiles);
    }

    private List<SearchIndexDocument> mapDocuments(List<ProfessionalSearchIndexProfileView> profiles) {
        if (profiles == null || profiles.isEmpty()) {
            return List.of();
        }

        List<Long> ids = profiles.stream()
            .map(ProfessionalSearchIndexProfileView::professionalId)
            .toList();

        Map<Long, List<String>> servicesByProfessional = professionalSearchIndexGateway.findActiveServiceNamesByProfessionalIds(ids);

        return profiles.stream()
            .map(profile -> toDocument(profile, servicesByProfessional.getOrDefault(profile.professionalId(), List.of())))
            .toList();
    }

    private SearchIndexDocument toDocument(ProfessionalSearchIndexProfileView profile, List<String> services) {
        return new SearchIndexDocument(
            profile.professionalId(),
            profile.slug(),
            profile.displayName(),
            profile.publicHeadline(),
            profile.locationText(),
            profile.categorySlugs(),
            services.stream()
                .map(name -> name == null ? "" : name.trim())
                .filter(name -> !name.isBlank())
                .toList(),
            profile.rating(),
            profile.latitude(),
            profile.longitude(),
            profile.hasAvailabilityToday()
        );
    }
}

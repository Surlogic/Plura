package com.plura.plurabackend.search.engine;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class SearchIndexService {

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfesionalServiceRepository profesionalServiceRepository;

    public SearchIndexService(
        ProfessionalProfileRepository professionalProfileRepository,
        ProfesionalServiceRepository profesionalServiceRepository
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
    }

    public List<SearchIndexDocument> buildDocumentsByProfessionalIds(Collection<Long> professionalIds) {
        if (professionalIds == null || professionalIds.isEmpty()) {
            return List.of();
        }

        List<ProfessionalProfile> profiles = professionalProfileRepository.findByIdInAndActiveTrueWithRelations(professionalIds);
        return mapDocuments(profiles);
    }

    public List<SearchIndexDocument> buildDocumentsPage(int page, int size) {
        List<ProfessionalProfile> profiles = professionalProfileRepository.findByActiveTrueWithRelationsOrderByCreatedAtDesc(
            PageRequest.of(Math.max(0, page), Math.max(1, size))
        );
        return mapDocuments(profiles);
    }

    private List<SearchIndexDocument> mapDocuments(List<ProfessionalProfile> profiles) {
        if (profiles == null || profiles.isEmpty()) {
            return List.of();
        }

        List<Long> ids = profiles.stream()
            .map(ProfessionalProfile::getId)
            .toList();

        Map<Long, List<String>> servicesByProfessional = profesionalServiceRepository
            .findByProfessional_IdInAndActiveTrueOrderByCreatedAtDesc(ids)
            .stream()
            .collect(
                Collectors.groupingBy(
                    service -> service.getProfessional().getId(),
                    Collectors.mapping(ProfesionalService::getName, Collectors.toList())
                )
            );

        return profiles.stream()
            .map(profile -> toDocument(profile, servicesByProfessional.getOrDefault(profile.getId(), List.of())))
            .toList();
    }

    private SearchIndexDocument toDocument(ProfessionalProfile profile, List<String> services) {
        Set<String> categories = profile.getCategories() == null
            ? Set.of()
            : profile.getCategories().stream()
                .map(category -> category.getSlug() == null ? "" : category.getSlug().trim())
                .filter(slug -> !slug.isBlank())
                .collect(Collectors.toSet());

        String displayName = profile.getDisplayName();
        if ((displayName == null || displayName.isBlank()) && profile.getUser() != null) {
            displayName = profile.getUser().getFullName();
        }

        return new SearchIndexDocument(
            profile.getId(),
            profile.getSlug(),
            displayName,
            profile.getPublicHeadline(),
            profile.getLocationText() == null ? profile.getLocation() : profile.getLocationText(),
            categories.stream().toList(),
            services.stream()
                .map(name -> name == null ? "" : name.trim())
                .filter(name -> !name.isBlank())
                .toList(),
            profile.getRating(),
            profile.getLatitude(),
            profile.getLongitude(),
            profile.getHasAvailabilityToday()
        );
    }
}

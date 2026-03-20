package com.plura.plurabackend.professional.profile;

import com.plura.plurabackend.core.professional.ProfessionalAvailabilityGateway;
import com.plura.plurabackend.core.professional.ProfessionalAvailabilityProfileView;
import com.plura.plurabackend.core.professional.ProfessionalServiceAvailabilityView;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ProfessionalAvailabilityGatewayService implements ProfessionalAvailabilityGateway {

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfesionalServiceRepository profesionalServiceRepository;

    public ProfessionalAvailabilityGatewayService(
        ProfessionalProfileRepository professionalProfileRepository,
        ProfesionalServiceRepository profesionalServiceRepository
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
    }

    @Override
    public List<Long> findActiveProfessionalIdsPage(int page, int size) {
        return professionalProfileRepository.findActiveIdsPaged(
            PageRequest.of(Math.max(0, page), Math.max(1, size))
        );
    }

    @Override
    public List<ProfessionalAvailabilityProfileView> findActiveProfessionalsByIds(Collection<Long> professionalIds) {
        if (professionalIds == null || professionalIds.isEmpty()) {
            return List.of();
        }
        return professionalProfileRepository.findByIdInAndActiveTrue(professionalIds).stream()
            .map(profile -> new ProfessionalAvailabilityProfileView(
                profile.getId(),
                true,
                profile.getScheduleJson(),
                profile.getSlotDurationMinutes()
            ))
            .toList();
    }

    @Override
    public Optional<ProfessionalAvailabilityProfileView> findActiveProfessionalById(Long professionalId) {
        if (professionalId == null) {
            return Optional.empty();
        }
        return professionalProfileRepository.findById(professionalId)
            .filter(profile -> Boolean.TRUE.equals(profile.getActive()))
            .map(profile -> new ProfessionalAvailabilityProfileView(
                profile.getId(),
                Boolean.TRUE.equals(profile.getActive()),
                profile.getScheduleJson(),
                profile.getSlotDurationMinutes()
            ));
    }

    @Override
    public List<ProfessionalServiceAvailabilityView> findActiveServicesByProfessionalId(Long professionalId) {
        if (professionalId == null) {
            return List.of();
        }
        return profesionalServiceRepository.findByProfessional_IdAndActiveTrueOrderByCreatedAtDesc(professionalId)
            .stream()
            .map(service -> new ProfessionalServiceAvailabilityView(
                professionalId,
                service.getId(),
                service.getDuration(),
                service.getPostBufferMinutes()
            ))
            .toList();
    }

    @Override
    public Map<Long, List<ProfessionalServiceAvailabilityView>> findActiveServicesByProfessionalIds(Collection<Long> professionalIds) {
        if (professionalIds == null || professionalIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<ProfessionalServiceAvailabilityView>> result = new LinkedHashMap<>();
        profesionalServiceRepository.findByProfessional_IdInAndActiveTrueOrderByCreatedAtDesc(professionalIds)
            .forEach(service -> {
                if (service.getProfessional() == null || service.getProfessional().getId() == null) {
                    return;
                }
                Long professionalId = service.getProfessional().getId();
                result.computeIfAbsent(professionalId, ignored -> new ArrayList<>())
                    .add(new ProfessionalServiceAvailabilityView(
                        professionalId,
                        service.getId(),
                        service.getDuration(),
                        service.getPostBufferMinutes()
                    ));
            });
        return result;
    }

    @Override
    @Transactional
    public void updateAvailabilitySummary(Long professionalId, boolean hasAvailabilityToday, LocalDateTime nextAvailableAt) {
        if (professionalId == null) {
            return;
        }
        professionalProfileRepository.updateAvailabilitySummary(professionalId, hasAvailabilityToday, nextAvailableAt);
    }

    @Override
    @Transactional
    public void updateHasAvailabilityToday(Long professionalId, boolean hasAvailabilityToday) {
        if (professionalId == null) {
            return;
        }
        professionalProfileRepository.updateHasAvailabilityToday(professionalId, hasAvailabilityToday);
    }

    @Override
    public long countActiveProfessionals() {
        return professionalProfileRepository.countByActiveTrue();
    }

    @Override
    public long countActiveProfessionalsWithNextAvailableAtNull() {
        return professionalProfileRepository.countActiveWithNextAvailableAtNull();
    }
}

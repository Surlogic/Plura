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

/**
 * ProfessionalAvailabilityGatewayService es un servicio de negocio del modulo profesionales / perfil.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: professionalProfileRepository, profesionalServiceRepository.
 * Foco funcional: profesionales, disponibilidad, servicios.
 */
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

    /**
     * Busca active profesional IDs pagina aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Override
    public List<Long> findActiveProfessionalIdsPage(int page, int size) {
        return professionalProfileRepository.findActiveIdsPaged(
            PageRequest.of(Math.max(0, page), Math.max(1, size))
        );
    }

    /**
     * Busca active professionals by IDs aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
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

    /**
     * Busca active profesional by ID aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
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

    /**
     * Busca active servicios by profesional ID aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
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

    /**
     * Busca active servicios by profesional IDs aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
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

    /**
     * Actualiza disponibilidad resumen manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Override
    @Transactional
    public void updateAvailabilitySummary(Long professionalId, boolean hasAvailabilityToday, LocalDateTime nextAvailableAt) {
        if (professionalId == null) {
            return;
        }
        professionalProfileRepository.updateAvailabilitySummary(professionalId, hasAvailabilityToday, nextAvailableAt);
    }

    /**
     * Actualiza has disponibilidad today manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Override
    @Transactional
    public void updateHasAvailabilityToday(Long professionalId, boolean hasAvailabilityToday) {
        if (professionalId == null) {
            return;
        }
        professionalProfileRepository.updateHasAvailabilityToday(professionalId, hasAvailabilityToday);
    }

    /**
     * Cuenta activos professionals sin cargar entidades completas cuando no hace falta.
     */
    @Override
    public long countActiveProfessionals() {
        return professionalProfileRepository.countByActiveTrue();
    }

    /**
     * Cuenta activos professionals with proximos available at null sin cargar entidades completas cuando no hace falta.
     */
    @Override
    public long countActiveProfessionalsWithNextAvailableAtNull() {
        return professionalProfileRepository.countActiveWithNextAvailableAtNull();
    }
}

package com.plura.plurabackend.professional.booking;

import com.plura.plurabackend.core.booking.ProfessionalActorLookupGateway;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * ProfessionalActorLookupService es un servicio de negocio del modulo profesionales / reservas.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: professionalProfileRepository.
 * Foco funcional: profesionales, servicios.
 */
@Service
public class ProfessionalActorLookupService implements ProfessionalActorLookupGateway {

    private final ProfessionalProfileRepository professionalProfileRepository;

    public ProfessionalActorLookupService(ProfessionalProfileRepository professionalProfileRepository) {
        this.professionalProfileRepository = professionalProfileRepository;
    }

    /**
     * Busca profesional ID by usuario ID aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Override
    public Optional<Long> findProfessionalIdByUserId(Long userId) {
        return professionalProfileRepository.findByUser_Id(userId).map(profile -> profile.getId());
    }
}

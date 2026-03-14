package com.plura.plurabackend.professional.booking;

import com.plura.plurabackend.core.booking.ProfessionalActorLookupGateway;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class ProfessionalActorLookupService implements ProfessionalActorLookupGateway {

    private final ProfessionalProfileRepository professionalProfileRepository;

    public ProfessionalActorLookupService(ProfessionalProfileRepository professionalProfileRepository) {
        this.professionalProfileRepository = professionalProfileRepository;
    }

    @Override
    public Optional<Long> findProfessionalIdByUserId(Long userId) {
        return professionalProfileRepository.findByUser_Id(userId).map(profile -> profile.getId());
    }
}

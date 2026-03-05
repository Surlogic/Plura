package com.plura.plurabackend.professional.service.repository;

import com.plura.plurabackend.professional.service.model.ProfesionalService;
import java.util.List;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfesionalServiceRepository extends JpaRepository<ProfesionalService, String> {
    List<ProfesionalService> findByProfessional_IdOrderByCreatedAtDesc(Long professionalId);

    List<ProfesionalService> findByProfessional_IdAndActiveTrueOrderByCreatedAtDesc(Long professionalId);

    List<ProfesionalService> findByProfessional_IdInAndActiveTrueOrderByCreatedAtDesc(Collection<Long> professionalIds);
}

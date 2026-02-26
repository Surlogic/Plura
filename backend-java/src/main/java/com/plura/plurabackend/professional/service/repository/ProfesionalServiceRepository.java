package com.plura.plurabackend.professional.service.repository;

import com.plura.plurabackend.professional.service.model.ProfesionalService;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfesionalServiceRepository extends JpaRepository<ProfesionalService, String> {
    List<ProfesionalService> findByProfessional_IdOrderByCreatedAtDesc(Long professionalId);
}

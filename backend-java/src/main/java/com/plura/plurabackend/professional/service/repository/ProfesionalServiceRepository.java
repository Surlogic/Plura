package com.plura.plurabackend.professional.service.repository;

import com.plura.plurabackend.professional.service.model.ProfesionalService;
import java.util.List;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProfesionalServiceRepository extends JpaRepository<ProfesionalService, String> {
    List<ProfesionalService> findByProfessional_IdOrderByCreatedAtDesc(Long professionalId);

    List<ProfesionalService> findByProfessional_IdAndActiveTrueOrderByCreatedAtDesc(Long professionalId);

    List<ProfesionalService> findByProfessional_IdInAndActiveTrueOrderByCreatedAtDesc(Collection<Long> professionalIds);

    @Modifying
    @Query(
        """
        UPDATE ProfesionalService service
        SET service.active = false
        WHERE service.professional.id = :professionalId
        """
    )
    int deactivateByProfessionalId(@Param("professionalId") Long professionalId);
}

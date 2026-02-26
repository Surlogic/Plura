package com.plura.plurabackend.professional.repository;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessionalProfileRepository extends JpaRepository<ProfessionalProfile, Long> {
    Optional<ProfessionalProfile> findBySlug(String slug);

    boolean existsBySlug(String slug);

    Optional<ProfessionalProfile> findByUser_Id(Long userId);
}

package com.plura.plurabackend.professional.repository;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProfessionalProfileRepository extends JpaRepository<ProfessionalProfile, Long> {
    Optional<ProfessionalProfile> findBySlug(String slug);

    boolean existsBySlug(String slug);

    Optional<ProfessionalProfile> findByUser_Id(Long userId);

    /** Lock pesimista para serializar creaciones de reservas sobre el mismo profesional. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProfessionalProfile p WHERE p.slug = :slug")
    Optional<ProfessionalProfile> findBySlugForUpdate(@Param("slug") String slug);
}

package com.plura.plurabackend.professional.repository;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

public interface ProfessionalProfileRepository extends JpaRepository<ProfessionalProfile, Long> {
    Optional<ProfessionalProfile> findBySlug(String slug);

    boolean existsBySlug(String slug);

    Optional<ProfessionalProfile> findByUser_Id(Long userId);

    long countByActiveTrue();

    List<ProfessionalProfile> findByIdInAndActiveTrue(Collection<Long> ids);

    @Query(
        """
        SELECT DISTINCT p
        FROM ProfessionalProfile p
        LEFT JOIN FETCH p.user
        LEFT JOIN FETCH p.categories
        WHERE p.id IN :ids AND p.active = true
        """
    )
    List<ProfessionalProfile> findByIdInAndActiveTrueWithRelations(@Param("ids") Collection<Long> ids);

    List<ProfessionalProfile> findByActiveTrueOrderByCreatedAtDesc(Pageable pageable);

    @Query(
        """
        SELECT DISTINCT p
        FROM ProfessionalProfile p
        LEFT JOIN FETCH p.user
        LEFT JOIN FETCH p.categories
        WHERE p.active = true
        ORDER BY p.createdAt DESC
        """
    )
    List<ProfessionalProfile> findByActiveTrueWithRelationsOrderByCreatedAtDesc(Pageable pageable);

    @Query(
        """
        SELECT DISTINCT p
        FROM ProfessionalProfile p
        LEFT JOIN FETCH p.user
        LEFT JOIN FETCH p.categories
        WHERE p.active = true
        """
    )
    List<ProfessionalProfile> findAllActiveWithRelations();

    /** Lock pesimista para serializar creaciones de reservas sobre el mismo profesional. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProfessionalProfile p WHERE p.slug = :slug")
    Optional<ProfessionalProfile> findBySlugForUpdate(@Param("slug") String slug);

    @Modifying
    @Query(
        value = """
            UPDATE professional_profile
            SET latitude = :lat,
                longitude = :lng,
                geom = CASE
                    WHEN :lat IS NULL OR :lng IS NULL THEN NULL
                    ELSE ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                END
            WHERE id = :profileId
            """,
        nativeQuery = true
    )
    void updateCoordinates(
        @Param("profileId") Long profileId,
        @Param("lat") Double latitude,
        @Param("lng") Double longitude
    );
}

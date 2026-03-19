package com.plura.plurabackend.professional.repository;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import org.springframework.data.jpa.repository.EntityGraph;
import jakarta.persistence.LockModeType;
import java.util.UUID;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

public interface ProfessionalProfileRepository extends JpaRepository<ProfessionalProfile, Long> {
    @EntityGraph(attributePaths = {"user", "categories"})
    Optional<ProfessionalProfile> findBySlug(String slug);

    @Query(
        """
        SELECT p
        FROM ProfessionalProfile p
        WHERE p.slug = :slug
        """
    )
    Optional<ProfessionalProfile> findSchedulingProfileBySlug(@Param("slug") String slug);

    boolean existsBySlug(String slug);

    @EntityGraph(attributePaths = {"user", "categories"})
    Optional<ProfessionalProfile> findByUser_Id(Long userId);

    @EntityGraph(attributePaths = {"user", "categories"})
    Optional<ProfessionalProfile> findByUser_EmailIgnoreCase(String email);

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
        SELECT p.id
        FROM ProfessionalProfile p
        WHERE p.active = true
            AND (
                :categoryId IS NULL
                OR EXISTS (
                    SELECT 1
                    FROM p.categories categoryById
                    WHERE categoryById.id = :categoryId
                )
            )
            AND (
                :categorySlug IS NULL
                OR :categorySlug = ''
                OR EXISTS (
                    SELECT 1
                    FROM p.categories categoryBySlug
                    WHERE LOWER(categoryBySlug.slug) = LOWER(:categorySlug)
                )
            )
        ORDER BY p.createdAt DESC
        """
    )
    Page<Long> findActiveIdsForPublicListing(
        @Param("categoryId") UUID categoryId,
        @Param("categorySlug") String categorySlug,
        Pageable pageable
    );

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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProfessionalProfile p WHERE p.id = :id")
    Optional<ProfessionalProfile> findByIdForUpdate(@Param("id") Long id);

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

    @Modifying
    @Query(
        value = """
            UPDATE professional_profile
            SET has_availability_today = :hasAvailabilityToday
            WHERE id = :profileId
            """,
        nativeQuery = true
    )
    void updateHasAvailabilityToday(
        @Param("profileId") Long profileId,
        @Param("hasAvailabilityToday") boolean hasAvailabilityToday
    );

    @Modifying
    @Query(
        value = """
            UPDATE professional_profile
            SET has_availability_today = :hasAvailabilityToday,
                next_available_at = :nextAvailableAt
            WHERE id = :profileId
            """,
        nativeQuery = true
    )
    void updateAvailabilitySummary(
        @Param("profileId") Long profileId,
        @Param("hasAvailabilityToday") boolean hasAvailabilityToday,
        @Param("nextAvailableAt") LocalDateTime nextAvailableAt
    );

    @Query(
        """
        SELECT COUNT(p)
        FROM ProfessionalProfile p
        WHERE p.active = true AND p.nextAvailableAt IS NULL
        """
    )
    long countActiveWithNextAvailableAtNull();
}

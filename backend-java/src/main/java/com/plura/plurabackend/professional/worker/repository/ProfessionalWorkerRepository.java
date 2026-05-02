package com.plura.plurabackend.professional.worker.repository;

import com.plura.plurabackend.professional.worker.model.ProfessionalWorker;
import com.plura.plurabackend.professional.worker.model.ProfessionalWorkerStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProfessionalWorkerRepository extends JpaRepository<ProfessionalWorker, Long> {

    @EntityGraph(attributePaths = {"professional", "user"})
    Optional<ProfessionalWorker> findByIdAndProfessional_Id(Long workerId, Long professionalId);

    @EntityGraph(attributePaths = {"professional", "user"})
    List<ProfessionalWorker> findByProfessional_IdAndStatusNotOrderByCreatedAtAsc(
        Long professionalId,
        ProfessionalWorkerStatus status
    );

    @EntityGraph(attributePaths = {"professional", "user"})
    Optional<ProfessionalWorker> findByProfessional_IdAndOwnerTrueAndStatusNot(
        Long professionalId,
        ProfessionalWorkerStatus status
    );

    @EntityGraph(attributePaths = {"professional", "user"})
    List<ProfessionalWorker> findByUser_IdAndStatus(
        Long userId,
        ProfessionalWorkerStatus status
    );

    @EntityGraph(attributePaths = {"professional", "professional.user", "user"})
    Optional<ProfessionalWorker> findByInviteTokenHashAndStatus(
        String inviteTokenHash,
        ProfessionalWorkerStatus status
    );

    long countByProfessional_IdAndStatusIn(
        Long professionalId,
        Collection<ProfessionalWorkerStatus> statuses
    );

    @Query(
        """
        SELECT worker
        FROM ProfessionalWorker worker
        JOIN FETCH worker.professional professional
        LEFT JOIN FETCH worker.user user
        WHERE worker.professional.id = :professionalId
          AND LOWER(worker.email) = LOWER(:email)
          AND worker.status <> com.plura.plurabackend.professional.worker.model.ProfessionalWorkerStatus.REMOVED
        """
    )
    Optional<ProfessionalWorker> findActiveLikeByProfessionalIdAndEmail(
        @Param("professionalId") Long professionalId,
        @Param("email") String email
    );
}

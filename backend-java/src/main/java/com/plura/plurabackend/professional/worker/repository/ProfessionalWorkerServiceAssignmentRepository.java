package com.plura.plurabackend.professional.worker.repository;

import com.plura.plurabackend.professional.worker.model.ProfessionalWorkerServiceAssignment;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ProfessionalWorkerServiceAssignmentRepository es un contrato interno del modulo profesionales / trabajadores / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: profesionales, servicios, trabajadores.
 */
public interface ProfessionalWorkerServiceAssignmentRepository
    extends JpaRepository<ProfessionalWorkerServiceAssignment, Long> {

    @EntityGraph(attributePaths = {"worker", "service"})
    List<ProfessionalWorkerServiceAssignment> findByWorker_Id(Long workerId);

    @EntityGraph(attributePaths = {"worker", "service"})
    List<ProfessionalWorkerServiceAssignment> findByWorker_IdAndActiveTrue(Long workerId);

    @EntityGraph(attributePaths = {"worker", "service"})
    List<ProfessionalWorkerServiceAssignment> findByProfessional_IdAndActiveTrue(Long professionalId);

    @EntityGraph(attributePaths = {"worker", "service"})
    List<ProfessionalWorkerServiceAssignment> findByProfessional_IdAndService_IdAndActiveTrue(
        Long professionalId,
        String serviceId
    );

    boolean existsByWorker_IdAndService_IdAndActiveTrue(Long workerId, String serviceId);

    long countByWorker_IdAndService_IdInAndActiveTrue(Long workerId, Collection<String> serviceIds);
}

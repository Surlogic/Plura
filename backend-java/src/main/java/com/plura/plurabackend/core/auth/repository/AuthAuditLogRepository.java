package com.plura.plurabackend.core.auth.repository;

import com.plura.plurabackend.core.auth.model.AuthAuditLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * AuthAuditLogRepository es un contrato interno del modulo autenticacion / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: auditoria, autenticacion y sesiones.
 */
public interface AuthAuditLogRepository extends JpaRepository<AuthAuditLog, Long> {

    List<AuthAuditLog> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);
}

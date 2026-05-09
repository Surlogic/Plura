package com.plura.plurabackend.core.analytics.tracking.repository;

import com.plura.plurabackend.core.analytics.tracking.model.AppProductEvent;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * AppProductEventRepository es un contrato interno del modulo analytics / tracking / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
public interface AppProductEventRepository extends JpaRepository<AppProductEvent, Long> {
}

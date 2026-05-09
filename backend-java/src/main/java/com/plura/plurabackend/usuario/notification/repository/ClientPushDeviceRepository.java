package com.plura.plurabackend.usuario.notification.repository;

import com.plura.plurabackend.usuario.notification.model.ClientPushDevice;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ClientPushDeviceRepository es un contrato interno del modulo cliente / notificaciones / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: clientes.
 */
public interface ClientPushDeviceRepository extends JpaRepository<ClientPushDevice, Long> {
    Optional<ClientPushDevice> findByPushToken(String pushToken);
}

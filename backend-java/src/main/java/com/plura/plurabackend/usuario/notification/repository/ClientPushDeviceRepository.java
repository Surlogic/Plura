package com.plura.plurabackend.usuario.notification.repository;

import com.plura.plurabackend.usuario.notification.model.ClientPushDevice;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientPushDeviceRepository extends JpaRepository<ClientPushDevice, Long> {
    Optional<ClientPushDevice> findByPushToken(String pushToken);
}

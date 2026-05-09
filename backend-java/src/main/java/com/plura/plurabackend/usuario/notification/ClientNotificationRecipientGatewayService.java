package com.plura.plurabackend.usuario.notification;

import com.plura.plurabackend.core.user.ClientNotificationRecipient;
import com.plura.plurabackend.core.user.ClientNotificationRecipientGateway;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * ClientNotificationRecipientGatewayService es un servicio de negocio del modulo cliente / notificaciones.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: userRepository.
 * Foco funcional: notificaciones, servicios, clientes.
 */
@Service
public class ClientNotificationRecipientGatewayService implements ClientNotificationRecipientGateway {

    private final UserRepository userRepository;

    public ClientNotificationRecipientGatewayService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Busca notificacion destinatario by usuario ID aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Override
    public Optional<ClientNotificationRecipient> findNotificationRecipientByUserId(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        return userRepository.findByIdAndDeletedAtIsNull(userId)
            .map(user -> new ClientNotificationRecipient(
                user.getId(),
                user.getEmail(),
                user.getFullName()
            ));
    }
}

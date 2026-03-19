package com.plura.plurabackend.usuario.notification;

import com.plura.plurabackend.core.user.ClientNotificationRecipient;
import com.plura.plurabackend.core.user.ClientNotificationRecipientGateway;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class ClientNotificationRecipientGatewayService implements ClientNotificationRecipientGateway {

    private final UserRepository userRepository;

    public ClientNotificationRecipientGatewayService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

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

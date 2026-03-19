package com.plura.plurabackend.core.user;

import java.util.Optional;

public interface ClientNotificationRecipientGateway {

    Optional<ClientNotificationRecipient> findNotificationRecipientByUserId(Long userId);
}

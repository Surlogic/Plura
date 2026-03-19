package com.plura.plurabackend.core.professional;

import java.util.Optional;

public interface ProfessionalNotificationRecipientGateway {

    Optional<ProfessionalNotificationRecipient> findNotificationRecipientByProfessionalId(Long professionalId);
}

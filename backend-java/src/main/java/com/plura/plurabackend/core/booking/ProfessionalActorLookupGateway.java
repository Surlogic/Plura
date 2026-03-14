package com.plura.plurabackend.core.booking;

import java.util.Optional;

public interface ProfessionalActorLookupGateway {

    Optional<Long> findProfessionalIdByUserId(Long userId);
}

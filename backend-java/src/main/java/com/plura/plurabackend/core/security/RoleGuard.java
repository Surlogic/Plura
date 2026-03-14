package com.plura.plurabackend.core.security;

import org.springframework.stereotype.Service;

@Service
public class RoleGuard {

    private final CurrentActorService currentActorService;

    public RoleGuard(CurrentActorService currentActorService) {
        this.currentActorService = currentActorService;
    }

    public Long requireProfessional() {
        return currentActorService.currentProfessionalUserId();
    }

    public Long requireUser() {
        return currentActorService.currentClientUserId();
    }
}

package com.plura.plurabackend.core.security;

import org.springframework.stereotype.Service;

/**
 * RoleGuard es un componente de dominio del modulo seguridad.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Colabora con: currentActorService.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
@Service
public class RoleGuard {

    private final CurrentActorService currentActorService;

    public RoleGuard(CurrentActorService currentActorService) {
        this.currentActorService = currentActorService;
    }

    /**
     * Exige profesional y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public Long requireProfessional() {
        return currentActorService.currentProfessionalUserId();
    }

    /**
     * Exige usuario y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public Long requireUser() {
        return currentActorService.currentClientUserId();
    }

    /**
     * Exige trabajador y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public Long requireWorker() {
        return currentActorService.currentWorkerId();
    }
}

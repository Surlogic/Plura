package com.plura.plurabackend.professional.worker;

import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerInvitationResponse;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerInviteRequest;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerResponse;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerServicesUpdateRequest;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerUpdateRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * ProfessionalTeamController es un controlador REST del modulo profesionales / trabajadores.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /profesional/team y deja la logica pesada en servicios.
 * Foco funcional: profesionales.
 */
@RestController
@RequestMapping("/profesional/team")
public class ProfessionalTeamController {

    private final ProfessionalTeamService professionalTeamService;
    private final RoleGuard roleGuard;

    public ProfessionalTeamController(
        ProfessionalTeamService professionalTeamService,
        RoleGuard roleGuard
    ) {
        this.professionalTeamService = professionalTeamService;
        this.roleGuard = roleGuard;
    }

    /**
     * Devuelve el listado de trabajadores aplicando permisos y filtros del caso de uso.
     */
    @GetMapping
    public List<ProfessionalWorkerResponse> listWorkers() {
        return professionalTeamService.listWorkers(currentProfessionalUserId());
    }

    /**
     * Ejecuta la logica de invitacion trabajador manteniendola encapsulada en este componente.
     */
    @PostMapping("/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    public ProfessionalWorkerInvitationResponse inviteWorker(
        @Valid @RequestBody ProfessionalWorkerInviteRequest request
    ) {
        return professionalTeamService.inviteWorker(currentProfessionalUserId(), request);
    }

    /**
     * Endpoint PATCH /{workerId}: Actualiza trabajador manteniendo reglas de negocio y consistencia de datos.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @PatchMapping("/{workerId}")
    public ProfessionalWorkerResponse updateWorker(
        @PathVariable Long workerId,
        @Valid @RequestBody ProfessionalWorkerUpdateRequest request
    ) {
        return professionalTeamService.updateWorker(currentProfessionalUserId(), workerId, request);
    }

    @GetMapping("/{workerId}/schedule")
    public ProfesionalScheduleDto getWorkerSchedule(@PathVariable Long workerId) {
        return professionalTeamService.getWorkerSchedule(currentProfessionalUserId(), workerId);
    }

    /**
     * Endpoint PUT /{workerId}/schedule: Actualiza trabajador agenda manteniendo reglas de negocio y consistencia de datos.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @PutMapping("/{workerId}/schedule")
    public ProfessionalWorkerResponse updateWorkerSchedule(
        @PathVariable Long workerId,
        @Valid @RequestBody ProfesionalScheduleDto request
    ) {
        return professionalTeamService.updateWorkerSchedule(currentProfessionalUserId(), workerId, request);
    }

    /**
     * Endpoint PUT /{workerId}/services: Actualiza trabajador servicios manteniendo reglas de negocio y consistencia de datos.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @PutMapping("/{workerId}/services")
    public ProfessionalWorkerResponse updateWorkerServices(
    /**
     * Obtiene el ID del usuario profesional autenticado desde el contexto actual.
     */
        @PathVariable Long workerId,
        @Valid @RequestBody ProfessionalWorkerServicesUpdateRequest request
    ) {
        return professionalTeamService.updateWorkerServices(currentProfessionalUserId(), workerId, request);
    }

    private String currentProfessionalUserId() {
        return String.valueOf(roleGuard.requireProfessional());
    }
}

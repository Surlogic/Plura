package com.plura.plurabackend.core.feedback.controller;

import com.plura.plurabackend.core.feedback.AppFeedbackService;
import com.plura.plurabackend.core.feedback.dto.AppFeedbackResponse;
import com.plura.plurabackend.core.feedback.dto.CreateAppFeedbackRequest;
import com.plura.plurabackend.core.feedback.model.AuthorRole;
import com.plura.plurabackend.core.security.CurrentActorService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * ProfessionalAppFeedbackController es un controlador REST del modulo feedback / controladores.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /profesional/app-feedback y deja la logica pesada en servicios.
 * Foco funcional: profesionales, feedback.
 */
@RestController
@RequestMapping("/profesional/app-feedback")
public class ProfessionalAppFeedbackController {

    private final AppFeedbackService appFeedbackService;
    private final CurrentActorService currentActorService;

    public ProfessionalAppFeedbackController(AppFeedbackService appFeedbackService, CurrentActorService currentActorService) {
        this.appFeedbackService = appFeedbackService;
        this.currentActorService = currentActorService;
    }

    /**
     * Endpoint POST: Crea create validando datos de entrada y persistiendo el resultado.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @PostMapping
    public ResponseEntity<AppFeedbackResponse> create(@Valid @RequestBody CreateAppFeedbackRequest request) {
        Long userId = currentActorService.currentProfessionalUserId();
        AppFeedbackResponse response = appFeedbackService.create(userId, AuthorRole.PROFESSIONAL, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Devuelve el listado de mine aplicando permisos y filtros del caso de uso.
     */
    @GetMapping("/mine")
    public Page<AppFeedbackResponse> listMine(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        Long userId = currentActorService.currentProfessionalUserId();
        return appFeedbackService.listMine(userId, page, size);
    }

    /**
     * Endpoint DELETE /{feedbackId}: Elimina delete y limpia relaciones o datos derivados cuando corresponde.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @DeleteMapping("/{feedbackId}")
    public ResponseEntity<Void> delete(@PathVariable Long feedbackId) {
        Long userId = currentActorService.currentProfessionalUserId();
        appFeedbackService.deleteMine(feedbackId, userId);
        return ResponseEntity.noContent().build();
    }
}

package com.plura.plurabackend.core.feedback;

import com.plura.plurabackend.core.feedback.dto.AppFeedbackResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * PublicAppFeedbackController es un controlador REST del modulo feedback.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /public/app-feedback y deja la logica pesada en servicios.
 * Foco funcional: feedback, superficie publica.
 */
@RestController
@RequestMapping("/public/app-feedback")
public class PublicAppFeedbackController {

    private final AppFeedbackService appFeedbackService;

    public PublicAppFeedbackController(AppFeedbackService appFeedbackService) {
        this.appFeedbackService = appFeedbackService;
    }

    /**
     * Devuelve el listado de publico aplicando permisos y filtros del caso de uso.
     */
    @GetMapping
    public List<AppFeedbackResponse> listPublic(
        @RequestParam(name = "limit", defaultValue = "6") int limit
    ) {
        return appFeedbackService.listPublic(limit);
    }
}

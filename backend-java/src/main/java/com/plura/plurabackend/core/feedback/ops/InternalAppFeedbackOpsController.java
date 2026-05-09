package com.plura.plurabackend.core.feedback.ops;

import com.plura.plurabackend.core.booking.ops.InternalOpsAccessService;
import com.plura.plurabackend.core.feedback.ops.dto.InternalFeedbackAnalyticsResponse;
import com.plura.plurabackend.core.feedback.ops.dto.InternalFeedbackDetailResponse;
import com.plura.plurabackend.core.feedback.ops.dto.InternalFeedbackListItemResponse;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * InternalAppFeedbackOpsController es un controlador REST del modulo feedback / operaciones internas.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /internal/ops/app-feedback y deja la logica pesada en servicios.
 * Foco funcional: feedback, paneles internos.
 */
@RestController
@RequestMapping("/internal/ops/app-feedback")
public class InternalAppFeedbackOpsController {

    private final InternalOpsAccessService internalOpsAccessService;
    private final InternalAppFeedbackOpsService internalAppFeedbackOpsService;

    public InternalAppFeedbackOpsController(
        InternalOpsAccessService internalOpsAccessService,
        InternalAppFeedbackOpsService internalAppFeedbackOpsService
    ) {
        this.internalOpsAccessService = internalOpsAccessService;
        this.internalAppFeedbackOpsService = internalAppFeedbackOpsService;
    }

    /**
     * Endpoint GET: Devuelve un listado de elementos del modulo aplicando los filtros disponibles.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @GetMapping
    public Page<InternalFeedbackListItemResponse> list(
        @RequestHeader("X-Internal-Token") String internalToken,
        @RequestParam(value = "page", defaultValue = "0") int page,
        @RequestParam(value = "size", defaultValue = "20") int size,
        @RequestParam(value = "authorRole", required = false) String authorRole,
        @RequestParam(value = "category", required = false) String category,
        @RequestParam(value = "rating", required = false) Integer rating,
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "from", required = false) String from,
        @RequestParam(value = "to", required = false) String to
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalAppFeedbackOpsService.list(page, size, authorRole, category, rating, status, from, to);
    }

    /**
     * Endpoint GET /{id}: Devuelve el detalle de un elemento puntual con los datos necesarios para la pantalla o API.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @GetMapping("/{id}")
    public InternalFeedbackDetailResponse detail(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long id
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalAppFeedbackOpsService.detail(id);
    }

    /**
     * Ejecuta la logica de archive manteniendola encapsulada en este componente.
     */
    @PatchMapping("/{id}/archive")
    public InternalFeedbackDetailResponse archive(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long id
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalAppFeedbackOpsService.archive(id);
    }

    /**
     * Ejecuta la logica de unarchive manteniendola encapsulada en este componente.
     */
    @PatchMapping("/{id}/unarchive")
    public InternalFeedbackDetailResponse unarchive(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long id
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalAppFeedbackOpsService.unarchive(id);
    }

    /**
     * Ejecuta la logica de analytics manteniendola encapsulada en este componente.
     */
    @GetMapping("/analytics")
    public InternalFeedbackAnalyticsResponse analytics(
        @RequestHeader("X-Internal-Token") String internalToken,
        @RequestParam(value = "from", required = false) String from,
        @RequestParam(value = "to", required = false) String to
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalAppFeedbackOpsService.analytics(from, to);
    }
}

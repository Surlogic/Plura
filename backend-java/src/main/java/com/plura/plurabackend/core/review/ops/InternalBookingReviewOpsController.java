package com.plura.plurabackend.core.review.ops;

import com.plura.plurabackend.core.booking.ops.InternalOpsAccessService;
import com.plura.plurabackend.core.review.ops.dto.InternalReviewAnalyticsResponse;
import com.plura.plurabackend.core.review.ops.dto.InternalReviewDetailResponse;
import com.plura.plurabackend.core.review.ops.dto.InternalReviewListItemResponse;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * InternalBookingReviewOpsController es un controlador REST del modulo resenas / operaciones internas.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /internal/ops/reviews y deja la logica pesada en servicios.
 * Foco funcional: paneles internos, reservas, resenas.
 */
@RestController
@RequestMapping("/internal/ops/reviews")
public class InternalBookingReviewOpsController {

    private final InternalOpsAccessService internalOpsAccessService;
    private final InternalBookingReviewOpsService reviewOpsService;

    public InternalBookingReviewOpsController(
        InternalOpsAccessService internalOpsAccessService,
        InternalBookingReviewOpsService reviewOpsService
    ) {
        this.internalOpsAccessService = internalOpsAccessService;
        this.reviewOpsService = reviewOpsService;
    }

    /**
     * Endpoint GET: Devuelve un listado de elementos del modulo aplicando los filtros disponibles.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @GetMapping
    public Page<InternalReviewListItemResponse> list(
        @RequestHeader("X-Internal-Token") String internalToken,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) Long professionalId,
        @RequestParam(required = false) Integer rating,
        @RequestParam(required = false) Boolean hasText,
        @RequestParam(required = false) Boolean textHidden,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return reviewOpsService.list(page, size, professionalId, rating, hasText, textHidden, from, to);
    }

    /**
     * Endpoint GET /{id}: Devuelve el detalle de un elemento puntual con los datos necesarios para la pantalla o API.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @GetMapping("/{id}")
    public InternalReviewDetailResponse detail(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable Long id
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return reviewOpsService.detail(id);
    }

    /**
     * Ejecuta la logica de hide text manteniendola encapsulada en este componente.
     */
    @PatchMapping("/{id}/hide-text")
    public InternalReviewDetailResponse hideText(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable Long id,
        @RequestParam(required = false) String note
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return reviewOpsService.hideText(id, note);
    }

    /**
     * Ejecuta la logica de show text manteniendola encapsulada en este componente.
     */
    @PatchMapping("/{id}/show-text")
    public InternalReviewDetailResponse showText(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable Long id
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return reviewOpsService.showText(id);
    }

    /**
     * Ejecuta la logica de analytics manteniendola encapsulada en este componente.
     */
    @GetMapping("/analytics")
    public InternalReviewAnalyticsResponse analytics(
        @RequestHeader("X-Internal-Token") String internalToken,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return reviewOpsService.analytics(from, to);
    }
}

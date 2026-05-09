package com.plura.plurabackend.core.analytics.ops;

import com.plura.plurabackend.core.analytics.ops.dto.InternalOpsAnalyticsResponse;
import com.plura.plurabackend.core.booking.ops.InternalOpsAccessService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * InternalOpsAnalyticsController es un controlador REST del modulo analytics / operaciones internas.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /internal/ops/analytics y deja la logica pesada en servicios.
 * Foco funcional: analytics, paneles internos.
 */
@RestController
@RequestMapping("/internal/ops/analytics")
public class InternalOpsAnalyticsController {

    private final InternalOpsAccessService internalOpsAccessService;
    private final InternalOpsAnalyticsService internalOpsAnalyticsService;

    public InternalOpsAnalyticsController(
        InternalOpsAccessService internalOpsAccessService,
        InternalOpsAnalyticsService internalOpsAnalyticsService
    ) {
        this.internalOpsAccessService = internalOpsAccessService;
        this.internalOpsAnalyticsService = internalOpsAnalyticsService;
    }

    /**
     * Endpoint GET /summary: Devuelve el resumen del modulo para el rango o filtros recibidos.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @GetMapping("/summary")
    public InternalOpsAnalyticsResponse summary(
        @RequestHeader(value = "X-Internal-Token", required = false) String internalToken,
        @RequestParam(value = "from", required = false) String from,
        @RequestParam(value = "to", required = false) String to
    ) {
        internalOpsAccessService.requireAuthorizedOrAdminClientSession(internalToken);
        return internalOpsAnalyticsService.summary(from, to);
    }
}

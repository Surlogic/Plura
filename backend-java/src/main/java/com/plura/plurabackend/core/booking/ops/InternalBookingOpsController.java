package com.plura.plurabackend.core.booking.ops;

import com.plura.plurabackend.core.booking.ops.dto.InternalBookingAlertsResponse;
import com.plura.plurabackend.core.booking.ops.dto.InternalBookingOpsActionResponse;
import com.plura.plurabackend.core.booking.ops.dto.InternalBookingOpsDetailResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * InternalBookingOpsController es un controlador REST del modulo reservas / operaciones internas.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /internal/ops/bookings y deja la logica pesada en servicios.
 * Foco funcional: paneles internos, reservas.
 */
@RestController
@RequestMapping("/internal/ops/bookings")
public class InternalBookingOpsController {

    private final InternalOpsAccessService internalOpsAccessService;
    private final InternalBookingOpsService internalBookingOpsService;

    public InternalBookingOpsController(
        InternalOpsAccessService internalOpsAccessService,
        InternalBookingOpsService internalBookingOpsService
    ) {
        this.internalOpsAccessService = internalOpsAccessService;
        this.internalBookingOpsService = internalBookingOpsService;
    }

    @GetMapping("/alerts")
    public InternalBookingAlertsResponse getAlerts(
        @RequestHeader("X-Internal-Token") String internalToken,
        @RequestParam(value = "olderThanMinutes", defaultValue = "60") long olderThanMinutes,
        @RequestParam(value = "heldOlderThanMinutes", defaultValue = "1440") long heldOlderThanMinutes
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalBookingOpsService.getAlerts(olderThanMinutes, heldOlderThanMinutes);
    }

    @GetMapping("/{id}/detail")
    public InternalBookingOpsDetailResponse getDetail(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long bookingId
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalBookingOpsService.getBookingDetail(bookingId);
    }

    /**
     * Ejecuta la logica de retry reembolso manteniendola encapsulada en este componente.
     */
    @PostMapping("/{id}/refund/retry")
    public InternalBookingOpsActionResponse retryRefund(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long bookingId
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalBookingOpsService.retryRefund(bookingId);
    }

    /**
     * Ejecuta la logica de recompute financial resumen manteniendola encapsulada en este componente.
     */
    @PostMapping("/{id}/financial/recompute")
    public InternalBookingOpsActionResponse recomputeFinancialSummary(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long bookingId
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalBookingOpsService.recomputeFinancialSummary(bookingId);
    }

    /**
     * Ejecuta la logica de reconcile reserva manteniendola encapsulada en este componente.
     */
    @PostMapping("/{id}/reconcile")
    public InternalBookingOpsActionResponse reconcileBooking(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long bookingId
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalBookingOpsService.reconcileBooking(bookingId);
    }
}

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

    @PostMapping("/{id}/refund/retry")
    public InternalBookingOpsActionResponse retryRefund(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long bookingId
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalBookingOpsService.retryRefund(bookingId);
    }

    @PostMapping("/{id}/financial/recompute")
    public InternalBookingOpsActionResponse recomputeFinancialSummary(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long bookingId
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalBookingOpsService.recomputeFinancialSummary(bookingId);
    }

    @PostMapping("/{id}/reconcile")
    public InternalBookingOpsActionResponse reconcileBooking(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long bookingId
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalBookingOpsService.reconcileBooking(bookingId);
    }
}

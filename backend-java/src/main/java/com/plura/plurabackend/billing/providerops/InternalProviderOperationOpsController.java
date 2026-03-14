package com.plura.plurabackend.billing.providerops;

import com.plura.plurabackend.billing.providerops.dto.InternalProviderOperationAlertsResponse;
import com.plura.plurabackend.booking.ops.InternalOpsAccessService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/ops/provider-operations")
public class InternalProviderOperationOpsController {

    private final InternalOpsAccessService internalOpsAccessService;
    private final InternalProviderOperationOpsService internalProviderOperationOpsService;
    private final ProviderOperationAlertThresholds thresholds;

    public InternalProviderOperationOpsController(
        InternalOpsAccessService internalOpsAccessService,
        InternalProviderOperationOpsService internalProviderOperationOpsService,
        ProviderOperationAlertThresholds thresholds
    ) {
        this.internalOpsAccessService = internalOpsAccessService;
        this.internalProviderOperationOpsService = internalProviderOperationOpsService;
        this.thresholds = thresholds;
    }

    @GetMapping("/alerts")
    public InternalProviderOperationAlertsResponse getAlerts(
        @RequestHeader("X-Internal-Token") String internalToken,
        @RequestParam(value = "uncertainOlderThanMinutes", required = false) Long uncertainOlderThanMinutes,
        @RequestParam(value = "retryableThreshold", required = false) Long retryableThreshold,
        @RequestParam(value = "leaseExpiredGraceMinutes", required = false) Long leaseExpiredGraceMinutes,
        @RequestParam(value = "sampleLimit", required = false) Integer sampleLimit
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalProviderOperationOpsService.getAlerts(
            uncertainOlderThanMinutes == null ? thresholds.uncertainOlderThanMinutes() : uncertainOlderThanMinutes,
            retryableThreshold == null ? thresholds.retryableThreshold() : retryableThreshold,
            leaseExpiredGraceMinutes == null ? thresholds.leaseExpiredGraceMinutes() : leaseExpiredGraceMinutes,
            sampleLimit == null ? thresholds.sampleLimit() : sampleLimit
        );
    }
}

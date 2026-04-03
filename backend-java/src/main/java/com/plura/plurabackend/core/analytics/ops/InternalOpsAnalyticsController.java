package com.plura.plurabackend.core.analytics.ops;

import com.plura.plurabackend.core.analytics.ops.dto.InternalOpsAnalyticsResponse;
import com.plura.plurabackend.core.booking.ops.InternalOpsAccessService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

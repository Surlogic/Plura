package com.plura.plurabackend.core.observability.ops;

import com.plura.plurabackend.core.booking.ops.InternalOpsAccessService;
import com.plura.plurabackend.core.observability.ops.dto.InternalAppErrorAnalyticsResponse;
import com.plura.plurabackend.core.observability.ops.dto.InternalAppErrorDetailResponse;
import com.plura.plurabackend.core.observability.ops.dto.InternalAppErrorListItemResponse;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/ops/app-errors")
public class InternalAppErrorOpsController {

    private final InternalOpsAccessService internalOpsAccessService;
    private final InternalAppErrorOpsService internalAppErrorOpsService;

    public InternalAppErrorOpsController(
        InternalOpsAccessService internalOpsAccessService,
        InternalAppErrorOpsService internalAppErrorOpsService
    ) {
        this.internalOpsAccessService = internalOpsAccessService;
        this.internalAppErrorOpsService = internalAppErrorOpsService;
    }

    @GetMapping
    public Page<InternalAppErrorListItemResponse> list(
        @RequestHeader("X-Internal-Token") String internalToken,
        @RequestParam(value = "page", defaultValue = "0") int page,
        @RequestParam(value = "size", defaultValue = "20") int size,
        @RequestParam(value = "source", required = false) String source,
        @RequestParam(value = "severity", required = false) String severity,
        @RequestParam(value = "resolved", required = false) Boolean resolved,
        @RequestParam(value = "from", required = false) String from,
        @RequestParam(value = "to", required = false) String to
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalAppErrorOpsService.list(page, size, source, severity, resolved, from, to);
    }

    @GetMapping("/{id}")
    public InternalAppErrorDetailResponse detail(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long id
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalAppErrorOpsService.detail(id);
    }

    @GetMapping("/analytics")
    public InternalAppErrorAnalyticsResponse analytics(
        @RequestHeader("X-Internal-Token") String internalToken,
        @RequestParam(value = "from", required = false) String from,
        @RequestParam(value = "to", required = false) String to
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalAppErrorOpsService.analytics(from, to);
    }
}

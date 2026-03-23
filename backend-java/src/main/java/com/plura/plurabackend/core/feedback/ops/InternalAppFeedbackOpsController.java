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

    @GetMapping("/{id}")
    public InternalFeedbackDetailResponse detail(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long id
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalAppFeedbackOpsService.detail(id);
    }

    @PatchMapping("/{id}/archive")
    public InternalFeedbackDetailResponse archive(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long id
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalAppFeedbackOpsService.archive(id);
    }

    @PatchMapping("/{id}/unarchive")
    public InternalFeedbackDetailResponse unarchive(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable("id") Long id
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return internalAppFeedbackOpsService.unarchive(id);
    }

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

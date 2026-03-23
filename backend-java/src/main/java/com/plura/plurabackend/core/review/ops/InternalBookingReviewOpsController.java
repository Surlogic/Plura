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

    @GetMapping("/{id}")
    public InternalReviewDetailResponse detail(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable Long id
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return reviewOpsService.detail(id);
    }

    @PatchMapping("/{id}/hide-text")
    public InternalReviewDetailResponse hideText(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable Long id,
        @RequestParam(required = false) String note
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return reviewOpsService.hideText(id, note);
    }

    @PatchMapping("/{id}/show-text")
    public InternalReviewDetailResponse showText(
        @RequestHeader("X-Internal-Token") String internalToken,
        @PathVariable Long id
    ) {
        internalOpsAccessService.requireAuthorized(internalToken);
        return reviewOpsService.showText(id);
    }

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

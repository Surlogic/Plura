package com.plura.plurabackend.core.analytics.tracking;

import com.plura.plurabackend.core.analytics.tracking.dto.PublicProductAnalyticsEventRequest;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/product-analytics")
public class PublicProductAnalyticsController {

    private static final String CLIENT_PLATFORM_HEADER = "X-Plura-Client-Platform";
    private static final String ANALYTICS_SESSION_HEADER = "X-Plura-Analytics-Session-Id";

    private final AppProductEventTrackingService appProductEventTrackingService;

    public PublicProductAnalyticsController(AppProductEventTrackingService appProductEventTrackingService) {
        this.appProductEventTrackingService = appProductEventTrackingService;
    }

    @PostMapping("/events")
    public void trackEvent(
        @RequestBody(required = false) PublicProductAnalyticsEventRequest request,
        @RequestHeader(value = CLIENT_PLATFORM_HEADER, required = false) String clientPlatform,
        @RequestHeader(value = ANALYTICS_SESSION_HEADER, required = false) String analyticsSessionId,
        Authentication authentication
    ) {
        appProductEventTrackingService.trackPublicProductEvent(
            clientPlatform,
            analyticsSessionId,
            resolveAuthenticatedUserId(authentication),
            request
        );
    }

    private Long resolveAuthenticatedUserId(Authentication authentication) {
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken
            || authentication.getPrincipal() == null) {
            return null;
        }
        try {
            return Long.valueOf(authentication.getPrincipal().toString());
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}

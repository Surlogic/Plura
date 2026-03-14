package com.plura.plurabackend.professional.analytics;

import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.professional.analytics.dto.ProfessionalAnalyticsSummaryResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/profesional/analytics")
public class ProfessionalAnalyticsController {

    private final ProfessionalAnalyticsService professionalAnalyticsService;
    private final RoleGuard roleGuard;

    public ProfessionalAnalyticsController(
        ProfessionalAnalyticsService professionalAnalyticsService,
        RoleGuard roleGuard
    ) {
        this.professionalAnalyticsService = professionalAnalyticsService;
        this.roleGuard = roleGuard;
    }

    @GetMapping("/summary")
    public ProfessionalAnalyticsSummaryResponse getSummary(
        @RequestParam(required = false) String view
    ) {
        return professionalAnalyticsService.getSummary(
            String.valueOf(roleGuard.requireProfessional()),
            ProfessionalAnalyticsView.fromNullableString(view)
        );
    }
}

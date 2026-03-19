package com.plura.plurabackend.professional.plan;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import com.plura.plurabackend.core.security.CurrentActorService;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class PlanGuardServiceTest {

    private final CurrentActorService currentActorService = mock(CurrentActorService.class);
    private final ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
    private final EffectiveProfessionalPlanService effectiveProfessionalPlanService = mock(EffectiveProfessionalPlanService.class);
    private final ProfessionalPlanPolicyService policyService = new ProfessionalPlanPolicyService();
    private final PlanGuardService service = new PlanGuardService(
        currentActorService,
        professionalAccessSupport,
        effectiveProfessionalPlanService
    );

    @Test
    void blocksCapabilityWhenCurrentPlanDoesNotAllowIt() {
        ProfessionalProfile profile = currentProfile(31L);
        stubPlan(profile, ProfessionalPlanCode.BASIC);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.requireBooleanCapability(BooleanCapability.ONLINE_PAYMENTS)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Tu plan no permite pagos online", exception.getReason());
    }

    @Test
    void allowsAtLeastComparisonForHigherPlan() {
        ProfessionalProfile profile = currentProfile(32L);
        stubPlan(profile, ProfessionalPlanCode.ENTERPRISE);

        assertDoesNotThrow(() -> service.requireAtLeast(ProfessionalPlanCode.PROFESIONAL));
    }

    @Test
    void blocksWhenLimitIsExceeded() {
        ProfessionalProfile profile = currentProfile(33L);
        stubPlan(profile, ProfessionalPlanCode.BASIC);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.requireLimitNotExceeded(LimitCapability.MAX_BUSINESS_PHOTOS, 6)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Tu plan permite hasta 5 fotos del negocio", exception.getReason());
    }

    @Test
    void keepsDailyScheduleRangeBlockedForBasic() {
        ProfessionalProfile profile = currentProfile(34L);
        stubPlan(profile, ProfessionalPlanCode.BASIC);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.requireScheduleRange("34", 2)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Tu plan actual solo permite consultar agenda diaria", exception.getReason());
    }

    @Test
    void allowsWeeklyScheduleRangeForProfesionalPlan() {
        ProfessionalProfile profile = currentProfile(35L);
        stubPlan(profile, ProfessionalPlanCode.PROFESIONAL);

        assertDoesNotThrow(() -> service.requireScheduleRange("35", 7));
    }

    private ProfessionalProfile currentProfile(Long userId) {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(userId);
        org.mockito.Mockito.when(currentActorService.currentProfessionalUserId()).thenReturn(userId);
        org.mockito.Mockito.when(professionalAccessSupport.loadProfessionalByUserId(String.valueOf(userId)))
            .thenReturn(profile);
        return profile;
    }

    private void stubPlan(ProfessionalProfile profile, ProfessionalPlanCode code) {
        org.mockito.Mockito.when(effectiveProfessionalPlanService.resolveForProfessional(profile))
            .thenReturn(new EffectiveProfessionalPlan(code, policyService.entitlementsFor(code)));
    }
}

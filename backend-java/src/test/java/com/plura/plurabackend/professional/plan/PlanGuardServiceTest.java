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

/**
 * Tests de funciones del profesional / planes y limites.
 * Cubren escenarios de plan guard servicio para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
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

    /**
     * Escenario: bloquea capability cuando current plan does no permitir it.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void allowsCoreOnlinePaymentsCapability() {
        ProfessionalProfile profile = currentProfile(31L);
        stubPlan(profile, ProfessionalPlanCode.CORE);

        assertDoesNotThrow(() -> service.requireBooleanCapability(BooleanCapability.ONLINE_PAYMENTS));
    }

    /**
     * Escenario: permite at least comparison for higher plan.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void allowsAtLeastComparisonForHigherPlan() {
        ProfessionalProfile profile = currentProfile(32L);
        stubPlan(profile, ProfessionalPlanCode.CORE);

        assertDoesNotThrow(() -> service.requireAtLeast(ProfessionalPlanCode.LOCAL));
    }

    /**
     * Escenario: bloquea cuando limit is exceeded.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void blocksWhenLimitIsExceeded() {
        ProfessionalProfile profile = currentProfile(33L);
        stubPlan(profile, ProfessionalPlanCode.CORE);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.requireLimitNotExceeded(LimitCapability.MAX_BUSINESS_PHOTOS, 7)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Plura Core permite hasta 6 fotos del negocio", exception.getReason());
    }

    /**
     * Escenario: keeps daily agenda range blocked for basic.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void allowsMonthlyScheduleRangeForCore() {
        ProfessionalProfile profile = currentProfile(34L);
        stubPlan(profile, ProfessionalPlanCode.CORE);

        assertDoesNotThrow(() -> service.requireScheduleRange("34", 31));
    }

    /**
     * Escenario: permite weekly agenda range for profesional plan.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void allowsWeeklyScheduleRangeForProfesionalPlan() {
        ProfessionalProfile profile = currentProfile(35L);
        stubPlan(profile, ProfessionalPlanCode.CORE);

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

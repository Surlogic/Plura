package com.plura.plurabackend.professional.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.category.repository.CategoryRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.plan.BooleanCapability;
import com.plura.plurabackend.professional.plan.PlanGuardService;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class ProfileServiceCatalogSupportTest {

    @Test
    void blocksPrepaidServiceCreationForBasicPlan() {
        PlanGuardService planGuardService = mock(PlanGuardService.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(11L);

        org.mockito.Mockito.doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Tu plan no permite pagos online"))
            .when(planGuardService)
            .requireBooleanCapability("11", BooleanCapability.ONLINE_PAYMENTS);

        ProfileServiceCatalogSupport support = new ProfileServiceCatalogSupport(
            mock(ProfesionalServiceRepository.class),
            mock(ProfilePublicPageAssembler.class),
            mock(ProfessionalSideEffectCoordinator.class),
            mock(CategoryRepository.class),
            planGuardService
        );

        ProfesionalServiceRequest request = new ProfesionalServiceRequest();
        request.setName("Corte");
        request.setPrice(java.math.BigDecimal.TEN);
        request.setDuration("30 min");
        request.setPaymentType(ServicePaymentType.DEPOSIT);
        request.setDepositAmount(java.math.BigDecimal.ONE);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> support.createService("11", profile, request)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Tu plan no permite pagos online", exception.getReason());
    }
}

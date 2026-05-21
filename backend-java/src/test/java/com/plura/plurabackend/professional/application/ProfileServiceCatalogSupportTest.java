package com.plura.plurabackend.professional.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.auth.repository.EmailVerificationChallengeRepository;
import com.plura.plurabackend.core.storage.ImageCleanupService;
import com.plura.plurabackend.core.storage.ImageStorageService;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.category.repository.CategoryRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.plan.BooleanCapability;
import com.plura.plurabackend.professional.plan.LimitCapability;
import com.plura.plurabackend.professional.plan.PlanGuardService;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Tests de funciones del profesional / casos de uso de aplicacion.
 * Cubren escenarios de perfil servicio catalog support para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class ProfileServiceCatalogSupportTest {

    /**
     * Escenario: bloquea cualquier alta de servicio cuando falta verificar email.
     * El objetivo es dejar explicita la regla vigente de alta del catalogo.
     */
    @Test
    void blocksServiceCreationWhenEmailIsNotVerified() {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(11L);
        profile.setUser(new User());
        ProfesionalServiceRepository repository = mock(ProfesionalServiceRepository.class);

        ProfileServiceCatalogSupport support = new ProfileServiceCatalogSupport(
            repository,
            mock(ProfilePublicPageAssembler.class),
            mock(ProfessionalSideEffectCoordinator.class),
            mock(CategoryRepository.class),
            mock(PlanGuardService.class),
            mock(ImageCleanupService.class),
            mock(ImageStorageService.class),
            mock(EmailVerificationChallengeRepository.class)
        );

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> support.createService("11", profile, validServiceRequest())
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Verificá tu email por código antes de crear servicios.", exception.getReason());
    }

    /**
     * Escenario: permite crear servicios con email verificado aunque el telefono siga pendiente.
     * El objetivo es evitar que vuelva el bloqueo por SMS en alta de servicios.
     */
    @Test
    void allowsFirstServiceCreationWhenEmailIsVerifiedAndPhoneIsPending() {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(11L);
        profile.setUser(verifiedUser());
        ProfesionalServiceRepository repository = mock(ProfesionalServiceRepository.class);
        when(repository.countByProfessional_Id(11L)).thenReturn(0L);

        ProfileServiceCatalogSupport support = new ProfileServiceCatalogSupport(
            repository,
            mock(ProfilePublicPageAssembler.class),
            mock(ProfessionalSideEffectCoordinator.class),
            mock(CategoryRepository.class),
            mock(PlanGuardService.class),
            mock(ImageCleanupService.class),
            mock(ImageStorageService.class),
            successfulEmailVerificationRepository(profile.getUser())
        );

        assertDoesNotThrow(() -> support.createService("11", profile, validServiceRequest()));
    }

    /**
     * Escenario: bloquea servicio creation cuando plan reached servicio limit.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void blocksServiceCreationWhenPlanReachedServiceLimit() {
        PlanGuardService planGuardService = mock(PlanGuardService.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(11L);
        profile.setUser(verifiedUser());
        ProfesionalServiceRepository repository = mock(ProfesionalServiceRepository.class);

        when(repository.countByProfessional_Id(11L)).thenReturn(15L);
        org.mockito.Mockito.doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plura Core permite hasta 30 servicios"))
            .when(planGuardService)
            .requireLimitNotExceeded("11", LimitCapability.MAX_SERVICES, 16L);

        ProfileServiceCatalogSupport support = new ProfileServiceCatalogSupport(
            repository,
            mock(ProfilePublicPageAssembler.class),
            mock(ProfessionalSideEffectCoordinator.class),
            mock(CategoryRepository.class),
            planGuardService,
            mock(ImageCleanupService.class),
            mock(ImageStorageService.class),
            successfulEmailVerificationRepository(profile.getUser())
        );

        ProfesionalServiceRequest request = new ProfesionalServiceRequest();
        request.setName("Corte");
        request.setPrice(java.math.BigDecimal.TEN);
        request.setDuration("30 min");

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> support.createService("11", profile, request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Plura Core permite hasta 30 servicios", exception.getReason());
    }

    /**
     * Escenario: bloquea prepaid servicio creation for basic plan.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void blocksPrepaidServiceCreationForBasicPlan() {
        PlanGuardService planGuardService = mock(PlanGuardService.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(11L);
        profile.setUser(verifiedUser());
        ProfesionalServiceRepository repository = mock(ProfesionalServiceRepository.class);

        when(repository.countByProfessional_Id(11L)).thenReturn(1L);
        org.mockito.Mockito.doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Este extra no está habilitado"))
            .when(planGuardService)
            .requireBooleanCapability("11", BooleanCapability.ONLINE_PAYMENTS);

        ProfileServiceCatalogSupport support = new ProfileServiceCatalogSupport(
            repository,
            mock(ProfilePublicPageAssembler.class),
            mock(ProfessionalSideEffectCoordinator.class),
            mock(CategoryRepository.class),
            planGuardService,
            mock(ImageCleanupService.class),
            mock(ImageStorageService.class),
            successfulEmailVerificationRepository(profile.getUser())
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
        assertEquals("Este extra no está habilitado", exception.getReason());
    }

    /**
     * Escenario: bloquea el alta cuando el usuario solo tiene timestamp legado/OAuth sin codigo confirmado.
     * El objetivo es evitar que el timestamp vuelva a equivaler a verificacion real de email.
     */
    @Test
    void blocksServiceCreationWhenEmailWasOnlyTrustedVerifiedWithoutCode() {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(11L);
        profile.setUser(verifiedUser());
        ProfesionalServiceRepository repository = mock(ProfesionalServiceRepository.class);

        ProfileServiceCatalogSupport support = new ProfileServiceCatalogSupport(
            repository,
            mock(ProfilePublicPageAssembler.class),
            mock(ProfessionalSideEffectCoordinator.class),
            mock(CategoryRepository.class),
            mock(PlanGuardService.class),
            mock(ImageCleanupService.class),
            mock(ImageStorageService.class),
            mock(EmailVerificationChallengeRepository.class)
        );

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> support.createService("11", profile, validServiceRequest())
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Verificá tu email por código antes de crear servicios.", exception.getReason());
    }

    private ProfesionalServiceRequest validServiceRequest() {
        ProfesionalServiceRequest request = new ProfesionalServiceRequest();
        request.setName("Corte");
        request.setPrice(java.math.BigDecimal.TEN);
        request.setDuration("30 min");
        return request;
    }

    private User verifiedUser() {
        User user = new User();
        user.setId(22L);
        user.setEmail("pro@plura.com");
        user.setEmailVerifiedAt(LocalDateTime.now());
        return user;
    }

    private EmailVerificationChallengeRepository successfulEmailVerificationRepository(User user) {
        EmailVerificationChallengeRepository repository = mock(EmailVerificationChallengeRepository.class);
        when(repository.existsSuccessfulVerificationByUserIdAndEmail(
            user.getId(),
            user.getEmail(),
            user.getEmailVerifiedAt()
        )).thenReturn(true);
        return repository;
    }
}

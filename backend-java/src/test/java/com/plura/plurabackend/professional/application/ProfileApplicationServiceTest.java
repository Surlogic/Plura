package com.plura.plurabackend.professional.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.storage.ImageCleanupService;
import com.plura.plurabackend.core.storage.ImageStorageService;
import com.plura.plurabackend.core.cache.ProfileCacheService;
import com.plura.plurabackend.professional.profile.ProfessionalCategorySupport;
import com.plura.plurabackend.professional.dto.ProfesionalBusinessProfileUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageUpdateRequest;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.photo.repository.BusinessPhotoRepository;
import com.plura.plurabackend.professional.plan.EffectiveProfessionalPlan;
import com.plura.plurabackend.professional.plan.PlanGuardService;
import com.plura.plurabackend.professional.plan.ProfessionalPlanCode;
import com.plura.plurabackend.professional.plan.ProfessionalPlanPolicyService;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import com.plura.plurabackend.core.storage.thumbnail.ImageThumbnailJobService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.repository.UserRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Tests de funciones del profesional / casos de uso de aplicacion.
 * Cubren escenarios de perfil application servicio para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class ProfileApplicationServiceTest {

    private ImageStorageService buildImageStorageServiceMock() {
        ImageStorageService imageStorageService = mock(ImageStorageService.class);
        when(imageStorageService.normalizeStoredReference(anyString())).thenAnswer(invocation -> invocation.getArgument(0));
        return imageStorageService;
    }

    /**
     * Escenario: bloquea publico page photo limit using profesional entitlements.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void blocksPublicPagePhotoLimitUsingProfessionalEntitlements() {
        PlanGuardService planGuardService = mock(PlanGuardService.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
        ProfessionalPlanPolicyService policyService = new ProfessionalPlanPolicyService();
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(21L);

        org.mockito.Mockito.when(professionalAccessSupport.loadProfessionalByUserId("21"))
            .thenReturn(profile);
        org.mockito.Mockito.when(planGuardService.effectivePlanForProfessionalUserId("21"))
            .thenReturn(new EffectiveProfessionalPlan(
                ProfessionalPlanCode.CORE,
                policyService.entitlementsFor(ProfessionalPlanCode.CORE)
            ));

        ProfileApplicationService service = new ProfileApplicationService(
            mock(ProfessionalProfileRepository.class),
            mock(BusinessPhotoRepository.class),
            mock(ProfessionalCategorySupport.class),
            mock(UserRepository.class),
            planGuardService,
            mock(ImageThumbnailJobService.class),
            mock(ImageCleanupService.class),
            buildImageStorageServiceMock(),
            mock(ProfileCacheService.class),
            professionalAccessSupport,
            mock(ProfessionalSideEffectCoordinator.class),
            mock(ProfilePublicPageAssembler.class),
            mock(ProfileBookingPolicySupport.class),
            mock(ProfileServiceCatalogSupport.class),
            mock(ProfileGeocodingSupport.class),
            mock(ProfesionalServiceRepository.class),
            new SimpleMeterRegistry()
        );

        ProfesionalPublicPageUpdateRequest request = new ProfesionalPublicPageUpdateRequest();
        request.setPhotos(List.of(
            "https://cdn.example/1.jpg",
            "https://cdn.example/2.jpg",
            "https://cdn.example/3.jpg",
            "https://cdn.example/4.jpg",
            "https://cdn.example/5.jpg",
            "https://cdn.example/6.jpg",
            "https://cdn.example/7.jpg"
        ));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.updatePublicPage("21", request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Plura Core permite hasta 6 fotos del negocio", exception.getReason());
    }

    /**
     * Escenario: permite enhanced publico page fields for basic plan cuando plan politica enables them.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void allowsEnhancedPublicPageFieldsForBasicPlanWhenPlanPolicyEnablesThem() {
        PlanGuardService planGuardService = mock(PlanGuardService.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
        ProfessionalProfileRepository professionalProfileRepository = mock(ProfessionalProfileRepository.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(21L);

        org.mockito.Mockito.when(professionalAccessSupport.loadProfessionalByUserId("21"))
            .thenReturn(profile);
        org.mockito.Mockito.when(professionalProfileRepository.save(profile)).thenReturn(profile);
        org.mockito.Mockito.when(planGuardService.effectivePlanForProfessionalUserId("21"))
            .thenReturn(new EffectiveProfessionalPlan(
                ProfessionalPlanCode.CORE,
                new ProfessionalPlanPolicyService().entitlementsFor(ProfessionalPlanCode.CORE)
            ));

        ProfileApplicationService service = new ProfileApplicationService(
            professionalProfileRepository,
            mock(BusinessPhotoRepository.class),
            mock(ProfessionalCategorySupport.class),
            mock(UserRepository.class),
            planGuardService,
            mock(ImageThumbnailJobService.class),
            mock(ImageCleanupService.class),
            buildImageStorageServiceMock(),
            mock(ProfileCacheService.class),
            professionalAccessSupport,
            mock(ProfessionalSideEffectCoordinator.class),
            mock(ProfilePublicPageAssembler.class),
            mock(ProfileBookingPolicySupport.class),
            mock(ProfileServiceCatalogSupport.class),
            mock(ProfileGeocodingSupport.class),
            mock(ProfesionalServiceRepository.class),
            new SimpleMeterRegistry()
        );

        ProfesionalPublicPageUpdateRequest request = new ProfesionalPublicPageUpdateRequest();
        request.setHeadline("Nueva portada");

        assertDoesNotThrow(() -> service.updatePublicPage("21", request));
        verify(planGuardService)
            .requirePublicProfileTier("21", com.plura.plurabackend.professional.plan.PublicProfileTier.ENHANCED);
    }

    /**
     * Escenario: permite enhanced business perfil fields for basic plan cuando plan politica enables them.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void allowsEnhancedBusinessProfileFieldsForBasicPlanWhenPlanPolicyEnablesThem() {
        PlanGuardService planGuardService = mock(PlanGuardService.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
        ProfessionalProfileRepository professionalProfileRepository = mock(ProfessionalProfileRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(21L);
        User user = new User();
        user.setId(21L);
        profile.setUser(user);

        org.mockito.Mockito.when(professionalAccessSupport.loadProfessionalByUserId("21"))
            .thenReturn(profile);
        org.mockito.Mockito.when(userRepository.save(user)).thenReturn(user);
        org.mockito.Mockito.when(professionalProfileRepository.save(profile)).thenReturn(profile);

        ProfileApplicationService service = new ProfileApplicationService(
            professionalProfileRepository,
            mock(BusinessPhotoRepository.class),
            mock(ProfessionalCategorySupport.class),
            userRepository,
            planGuardService,
            mock(ImageThumbnailJobService.class),
            mock(ImageCleanupService.class),
            buildImageStorageServiceMock(),
            mock(ProfileCacheService.class),
            professionalAccessSupport,
            mock(ProfessionalSideEffectCoordinator.class),
            mock(ProfilePublicPageAssembler.class),
            mock(ProfileBookingPolicySupport.class),
            mock(ProfileServiceCatalogSupport.class),
            mock(ProfileGeocodingSupport.class),
            mock(ProfesionalServiceRepository.class),
            new SimpleMeterRegistry()
        );

        ProfesionalBusinessProfileUpdateRequest request = new ProfesionalBusinessProfileUpdateRequest();
        request.setLogoUrl("https://cdn.example/logo.png");

        assertDoesNotThrow(() -> service.updateBusinessProfile("21", request));
        verify(planGuardService)
            .requirePublicProfileTier("21", com.plura.plurabackend.professional.plan.PublicProfileTier.ENHANCED);
    }

    /**
     * Escenario: permite core business perfil fields sin enhanced tier.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void allowsCoreBusinessProfileFieldsWithoutEnhancedTier() {
        PlanGuardService planGuardService = mock(PlanGuardService.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
        ProfessionalProfileRepository professionalProfileRepository = mock(ProfessionalProfileRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        User user = new User();
        user.setId(21L);
        profile.setId(21L);
        profile.setUser(user);

        org.mockito.Mockito.when(professionalAccessSupport.loadProfessionalByUserId("21"))
            .thenReturn(profile);
        org.mockito.Mockito.when(userRepository.save(user)).thenReturn(user);
        org.mockito.Mockito.when(professionalProfileRepository.save(profile)).thenReturn(profile);

        ProfileApplicationService service = new ProfileApplicationService(
            professionalProfileRepository,
            mock(BusinessPhotoRepository.class),
            mock(ProfessionalCategorySupport.class),
            userRepository,
            planGuardService,
            mock(ImageThumbnailJobService.class),
            mock(ImageCleanupService.class),
            buildImageStorageServiceMock(),
            mock(ProfileCacheService.class),
            professionalAccessSupport,
            mock(ProfessionalSideEffectCoordinator.class),
            mock(ProfilePublicPageAssembler.class),
            mock(ProfileBookingPolicySupport.class),
            mock(ProfileServiceCatalogSupport.class),
            mock(ProfileGeocodingSupport.class),
            mock(ProfesionalServiceRepository.class),
            new SimpleMeterRegistry()
        );

        ProfesionalBusinessProfileUpdateRequest request = new ProfesionalBusinessProfileUpdateRequest();
        request.setFullName("Nuevo nombre");

        service.updateBusinessProfile("21", request);

        verifyNoInteractions(planGuardService);
    }
}

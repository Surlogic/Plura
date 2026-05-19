package com.plura.plurabackend.core.billing.trial;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import com.plura.plurabackend.core.billing.trial.BillingTrialEligibilityService.TrialEligibility;
import com.plura.plurabackend.core.billing.trial.model.BillingTrialClaim;
import com.plura.plurabackend.core.billing.trial.repository.BillingTrialClaimRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class BillingTrialEligibilityServiceTest {

    private final BillingTrialClaimRepository repository = mock(BillingTrialClaimRepository.class);
    private final BillingTrialEligibilityService service =
        new BillingTrialEligibilityService(repository, "pepper-de-test-con-suficiente-entropia");

    @BeforeEach
    void setUp() {
        when(repository.saveAndFlush(any(BillingTrialClaim.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void trialNuevoCreaClaimConHashesIrreversibles() {
        ProfessionalProfile professional = professional("Pro@Plura.COM", "+598 99 123 456", null, null);

        TrialEligibility eligibility = service.evaluateEligibility(SubscriptionPlanCode.PLAN_CORE, professional);
        BillingTrialClaim claim = service.claimTrialStarted(SubscriptionPlanCode.PLAN_CORE, professional);

        assertTrue(eligibility.trialEligible());
        assertFalse(eligibility.trialPreviouslyUsed());
        assertEquals(SubscriptionPlanCode.PLAN_CORE, claim.getPlanCode());
        assertEquals(10L, claim.getFirstUserId());
        assertEquals(30L, claim.getFirstProfessionalId());
        assertHashedIdentity(claim.getEmailHash(), "pro@plura.com");
        assertHashedIdentity(claim.getPhoneHash(), "+59899123456");
        assertNotNull(claim.getClaimedAt());
        verify(repository).saveAndFlush(any(BillingTrialClaim.class));
    }

    @Test
    void trialRepetidoPorEmailNoEsElegible() {
        when(repository.existsByPlanCodeAndEmailHash(eq(SubscriptionPlanCode.PLAN_CORE), anyString()))
            .thenReturn(true);

        TrialEligibility eligibility = service.evaluateEligibility(
            SubscriptionPlanCode.PLAN_CORE,
            professional("repite@plura.com", "+59899123456", null, null)
        );

        assertFalse(eligibility.trialEligible());
        assertTrue(eligibility.trialPreviouslyUsed());
    }

    @Test
    void trialRepetidoPorTelefonoNoEsElegible() {
        when(repository.existsByPlanCodeAndPhoneHash(eq(SubscriptionPlanCode.PLAN_CORE), anyString()))
            .thenReturn(true);

        TrialEligibility eligibility = service.evaluateEligibility(
            SubscriptionPlanCode.PLAN_CORE,
            professional("nuevo@plura.com", "+598 99 123 456", null, null)
        );

        assertFalse(eligibility.trialEligible());
        assertTrue(eligibility.trialPreviouslyUsed());
    }

    @Test
    void ensureTrialClaimAntesDeBorrarCuentaReutilizaNormalizacionHash() {
        User user = user("Delete@Plura.COM", "+598 91 111 222", "google", "oauth-123");

        boolean created = service.ensureTrialClaim(SubscriptionPlanCode.PLAN_CORE, user, 30L);

        assertTrue(created);
        ArgumentCaptor<BillingTrialClaim> captor = ArgumentCaptor.forClass(BillingTrialClaim.class);
        verify(repository).saveAndFlush(captor.capture());
        BillingTrialClaim claim = captor.getValue();
        assertEquals(10L, claim.getFirstUserId());
        assertEquals(30L, claim.getFirstProfessionalId());
        assertHashedIdentity(claim.getEmailHash(), "delete@plura.com");
        assertHashedIdentity(claim.getPhoneHash(), "+59891111222");
        assertHashedIdentity(claim.getOauthIdentityHash(), "google:oauth-123");
    }

    private void assertHashedIdentity(String hash, String plainValue) {
        assertNotNull(hash);
        assertEquals(64, hash.length());
        assertNotEquals(plainValue, hash);
    }

    private ProfessionalProfile professional(String email, String phoneNumber, String provider, String providerId) {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(30L);
        profile.setUser(user(email, phoneNumber, provider, providerId));
        profile.setActive(true);
        return profile;
    }

    private User user(String email, String phoneNumber, String provider, String providerId) {
        User user = new User();
        user.setId(10L);
        user.setFullName("Profesional Demo");
        user.setEmail(email);
        user.setPhoneNumber(phoneNumber);
        user.setProvider(provider);
        user.setProviderId(providerId);
        user.setPassword("secret");
        user.setRole(UserRole.PROFESSIONAL);
        return user;
    }
}

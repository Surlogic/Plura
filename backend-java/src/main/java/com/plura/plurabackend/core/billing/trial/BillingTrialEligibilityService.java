package com.plura.plurabackend.core.billing.trial;

import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import com.plura.plurabackend.core.billing.trial.model.BillingTrialClaim;
import com.plura.plurabackend.core.billing.trial.repository.BillingTrialClaimRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BillingTrialEligibilityService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String TRIAL_ALREADY_USED_MESSAGE = "La prueba gratuita ya fue utilizada para esta identidad.";

    private final BillingTrialClaimRepository billingTrialClaimRepository;
    private final String identityPepper;

    public BillingTrialEligibilityService(
        BillingTrialClaimRepository billingTrialClaimRepository,
        @Value("${billing.trial.identity-pepper:}") String identityPepper
    ) {
        this.billingTrialClaimRepository = billingTrialClaimRepository;
        this.identityPepper = identityPepper == null ? "" : identityPepper.trim();
    }

    @PostConstruct
    void validateConfiguration() {
        if (identityPepper.isBlank()) {
            throw new IllegalStateException("BILLING_TRIAL_IDENTITY_PEPPER no está configurado");
        }
    }

    public TrialEligibility evaluateEligibility(SubscriptionPlanCode planCode, ProfessionalProfile professional) {
        TrialIdentity identity = resolveIdentity(professional);
        boolean previouslyUsed = hasExistingClaim(planCode, identity);
        return new TrialEligibility(!previouslyUsed, previouslyUsed);
    }

    public BillingTrialClaim claimTrialStarted(SubscriptionPlanCode planCode, ProfessionalProfile professional) {
        TrialIdentity identity = resolveIdentity(professional);
        return createClaim(planCode, identity, professional.getId());
    }

    public boolean ensureTrialClaim(SubscriptionPlanCode planCode, User user, Long professionalId) {
        TrialIdentity identity = resolveIdentity(user);
        if (hasExistingClaim(planCode, identity)) {
            return false;
        }
        createClaim(planCode, identity, professionalId);
        return true;
    }

    private BillingTrialClaim createClaim(SubscriptionPlanCode planCode, TrialIdentity identity, Long professionalId) {
        if (professionalId == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Profesional inválido para registrar prueba gratuita");
        }
        BillingTrialClaim claim = new BillingTrialClaim();
        claim.setPlanCode(planCode);
        claim.setEmailHash(identity.emailHash());
        claim.setPhoneHash(identity.phoneHash());
        claim.setOauthIdentityHash(identity.oauthIdentityHash());
        claim.setFirstUserId(identity.userId());
        claim.setFirstProfessionalId(professionalId);
        claim.setClaimedAt(Instant.now());
        try {
            return billingTrialClaimRepository.saveAndFlush(claim);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, TRIAL_ALREADY_USED_MESSAGE, exception);
        }
    }

    private TrialIdentity resolveIdentity(ProfessionalProfile professional) {
        if (professional == null || professional.getId() == null || professional.getUser() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Profesional inválido para validar prueba gratuita");
        }
        return resolveIdentity(professional.getUser());
    }

    private TrialIdentity resolveIdentity(User user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Usuario inválido para validar prueba gratuita");
        }
        if (user.getId() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Usuario inválido para validar prueba gratuita");
        }

        String emailHash = hashNullable("email", normalizeEmail(user.getEmail()));
        String phoneHash = hashNullable("phone", normalizePhone(user.getPhoneNumber()));
        String oauthIdentityHash = hashNullable("oauth", normalizeOAuthIdentity(user.getProvider(), user.getProviderId()));

        if (emailHash == null && phoneHash == null && oauthIdentityHash == null) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La cuenta necesita email, teléfono u OAuth para validar la prueba gratuita"
            );
        }

        return new TrialIdentity(user.getId(), emailHash, phoneHash, oauthIdentityHash);
    }

    private boolean hasExistingClaim(SubscriptionPlanCode planCode, TrialIdentity identity) {
        return (identity.emailHash() != null && billingTrialClaimRepository.existsByPlanCodeAndEmailHash(planCode, identity.emailHash()))
            || (identity.phoneHash() != null && billingTrialClaimRepository.existsByPlanCodeAndPhoneHash(planCode, identity.phoneHash()))
            || (identity.oauthIdentityHash() != null && billingTrialClaimRepository.existsByPlanCodeAndOauthIdentityHash(planCode, identity.oauthIdentityHash()));
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            return null;
        }
        String normalized = phone.trim().replaceAll("[^0-9+]", "");
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeOAuthIdentity(String provider, String providerId) {
        if (provider == null || providerId == null) {
            return null;
        }
        String normalizedProvider = provider.trim().toLowerCase(Locale.ROOT);
        String normalizedProviderId = providerId.trim();
        if (normalizedProvider.isBlank() || normalizedProviderId.isBlank()) {
            return null;
        }
        return normalizedProvider + ":" + normalizedProviderId;
    }

    private String hashNullable(String type, String value) {
        if (value == null) {
            return null;
        }
        return hmac(type + ":" + value);
    }

    private String hmac(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(identityPepper.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("No se pudo calcular HMAC de identidad de trial", exception);
        }
    }

    private record TrialIdentity(Long userId, String emailHash, String phoneHash, String oauthIdentityHash) {
    }

    public record TrialEligibility(boolean trialEligible, boolean trialPreviouslyUsed) {
    }
}

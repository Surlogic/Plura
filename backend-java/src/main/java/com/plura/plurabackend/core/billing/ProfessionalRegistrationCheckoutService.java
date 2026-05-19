package com.plura.plurabackend.core.billing;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTCreator;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;
import com.plura.plurabackend.core.billing.dto.ProfessionalRegistrationCheckoutRequest;
import com.plura.plurabackend.core.billing.dto.ProfessionalRegistrationCheckoutResponse;
import com.plura.plurabackend.core.billing.mercadopago.MercadoPagoSubscriptionService;
import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.subscriptions.model.Subscription;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionStatus;
import com.plura.plurabackend.core.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.core.professional.ProfessionalBillingSubjectGateway;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfessionalRegistrationCheckoutService {

    private static final String TOKEN_TYPE = "professional_registration_checkout";

    private final BillingProperties billingProperties;
    private final MercadoPagoSubscriptionService mercadoPagoSubscriptionService;
    private final SubscriptionRepository subscriptionRepository;
    private final ProfessionalBillingSubjectGateway professionalBillingSubjectGateway;
    private final RoleGuard roleGuard;
    private final UserRepository userRepository;
    private final Algorithm tokenAlgorithm;
    private final String jwtIssuer;

    public ProfessionalRegistrationCheckoutService(
        BillingProperties billingProperties,
        MercadoPagoSubscriptionService mercadoPagoSubscriptionService,
        SubscriptionRepository subscriptionRepository,
        ProfessionalBillingSubjectGateway professionalBillingSubjectGateway,
        RoleGuard roleGuard,
        UserRepository userRepository,
        @Value("${jwt.refresh-pepper}") String tokenSecret,
        @Value("${jwt.issuer:plura-backend}") String jwtIssuer
    ) {
        if (tokenSecret == null || tokenSecret.isBlank()) {
            throw new IllegalStateException("jwt.refresh-pepper no esta configurado");
        }
        this.billingProperties = billingProperties;
        this.mercadoPagoSubscriptionService = mercadoPagoSubscriptionService;
        this.subscriptionRepository = subscriptionRepository;
        this.professionalBillingSubjectGateway = professionalBillingSubjectGateway;
        this.roleGuard = roleGuard;
        this.userRepository = userRepository;
        this.tokenAlgorithm = Algorithm.HMAC256(tokenSecret);
        this.jwtIssuer = jwtIssuer;
    }

    public ProfessionalRegistrationCheckoutResponse startCheckout(ProfessionalRegistrationCheckoutRequest request) {
        ensureBillingEnabled();
        SubscriptionPlanCode plan = resolveRequestedCorePlan(request.getPlanCode());
        BillingProperties.PlanConfig planConfig = billingProperties.resolvePlan(plan);
        String email = normalizeEmail(request.getEmail());
        ensureEmailDoesNotHaveActiveProfessional(email);
        String registrationReference = "professional-registration:" + UUID.randomUUID();

        MercadoPagoSubscriptionService.SubscriptionCheckoutSession session =
            mercadoPagoSubscriptionService.createSubscription(
                new MercadoPagoSubscriptionService.CreateSubscriptionCommand(
                    null,
                    registrationReference,
                    registrationReference,
                    email,
                    plan,
                    planConfig.getPrice(),
                    planConfig.getCurrency(),
                    normalizeReturnUrl(request.getReturnUrl())
                )
            );

        if (session.providerSubscriptionId() == null || session.providerSubscriptionId().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Mercado Pago no devolvió una suscripción verificable. Reintentá la activación."
            );
        }

        String checkoutToken = buildCheckoutToken(email, session.providerSubscriptionId(), plan);

        return new ProfessionalRegistrationCheckoutResponse(
            session.checkoutUrl(),
            checkoutToken,
            "MERCADOPAGO",
            plan.canonicalCode(),
            "CHECKOUT_PENDING",
            null,
            null,
            session.checkoutUrl() != null && !session.checkoutUrl().isBlank(),
            false
        );
    }

    public ProfessionalRegistrationCheckoutResponse verifyCheckout(String checkoutToken) {
        CheckoutToken token = verifyCheckoutToken(checkoutToken);
        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot =
            mercadoPagoSubscriptionService.getSubscription(token.providerSubscriptionId());
        String status = normalizeStatus(snapshot.status());
        boolean confirmed = "authorized".equals(status) || "active".equals(status);

        return new ProfessionalRegistrationCheckoutResponse(
            null,
            checkoutToken,
            "MERCADOPAGO",
            token.plan().canonicalCode(),
            confirmed ? "ACTIVE" : "CHECKOUT_PENDING",
            null,
            null,
            false,
            confirmed
        );
    }

    public void requireConfirmedCheckoutForEmail(String checkoutToken, String rawEmail) {
        CheckoutToken token = verifyCheckoutToken(checkoutToken);
        String expectedEmail = normalizeEmail(rawEmail);
        if (!expectedEmail.equals(token.email())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El checkout confirmado no pertenece a este email");
        }
        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot =
            mercadoPagoSubscriptionService.getSubscription(token.providerSubscriptionId());
        String status = normalizeStatus(snapshot.status());
        if (!"authorized".equals(status) && !"active".equals(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mercado Pago todavía no confirmó la suscripción");
        }
    }

    public void requireConfirmedCheckoutForAuthenticatedEmail(String checkoutToken, String rawEmail) {
        requireConfirmedCheckoutForEmail(checkoutToken, rawEmail);
    }

    @Transactional
    public ProfessionalRegistrationCheckoutResponse attachConfirmedCheckoutToAuthenticatedProfessional(
        String checkoutToken
    ) {
        Long userId = roleGuard.requireProfessional();
        ProfessionalProfile professional = professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(userId);
        return attachConfirmedCheckoutToProfessional(checkoutToken, professional);
    }

    @Transactional
    public ProfessionalRegistrationCheckoutResponse attachConfirmedCheckoutToProfessional(
        String checkoutToken,
        ProfessionalProfile professional
    ) {
        if (professional == null || professional.getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Perfil profesional inválido");
        }
        CheckoutToken token = verifyCheckoutToken(checkoutToken);
        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot =
            mercadoPagoSubscriptionService.getSubscription(token.providerSubscriptionId());
        String status = normalizeStatus(snapshot.status());
        if (!"authorized".equals(status) && !"active".equals(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mercado Pago todavía no confirmó la suscripción");
        }

        String professionalEmail = professional.getUser() == null ? null : normalizeEmail(professional.getUser().getEmail());
        if (professionalEmail == null || !professionalEmail.equals(token.email())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El checkout confirmado no pertenece a este profesional");
        }
        BillingProperties.PlanConfig planConfig = billingProperties.resolvePlan(token.plan());
        LocalDateTime now = LocalDateTime.now();
        Subscription subscription = subscriptionRepository
            .findByProviderAndProviderSubscriptionIdForUpdate(PaymentProvider.MERCADOPAGO, token.providerSubscriptionId())
            .orElse(null);
        if (subscription != null && !professional.getId().equals(subscription.getProfessionalId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La suscripción ya está asociada a otro profesional");
        }
        if (subscription == null) {
            subscription = subscriptionRepository.findByProfessionalIdForUpdate(professional.getId())
                .orElseGet(Subscription::new);
        }

        subscription.setProfessionalId(professional.getId());
        subscription.setPlan(token.plan());
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setProvider(PaymentProvider.MERCADOPAGO);
        subscription.setPlanAmount(planConfig.getPrice());
        subscription.setCurrency(planConfig.getCurrency());
        subscription.setExpectedAmount(planConfig.getPrice());
        subscription.setExpectedCurrency(planConfig.getCurrency());
        subscription.setProviderSubscriptionId(token.providerSubscriptionId());
        subscription.setPaymentMethodAttachedAt(now);
        subscription.setCurrentPeriodStart(now);
        subscription.setCurrentPeriodEnd(now.plusMonths(1));
        subscription.setCancelAtPeriodEnd(false);
        subscriptionRepository.saveAndFlush(subscription);

        return new ProfessionalRegistrationCheckoutResponse(
            null,
            checkoutToken,
            "MERCADOPAGO",
            token.plan().canonicalCode(),
            "ACTIVE",
            null,
            null,
            false,
            true
        );
    }

    private void ensureEmailDoesNotHaveActiveProfessional(String email) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(email).orElse(null);
        if (user == null) {
            return;
        }
        ProfessionalProfile profile = professionalBillingSubjectGateway.findByEmailIgnoreCase(email).orElse(null);
        if (profile != null && Boolean.TRUE.equals(profile.getActive())) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Ya existe una cuenta profesional con este email. Iniciá sesión."
            );
        }
    }

    private String buildCheckoutToken(
        String email,
        String providerSubscriptionId,
        SubscriptionPlanCode plan
    ) {
        JWTCreator.Builder tokenBuilder = JWT.create()
            .withIssuer(jwtIssuer)
            .withSubject(email)
            .withClaim("typ", TOKEN_TYPE)
            .withClaim("email", email)
            .withClaim("provider", "MERCADOPAGO")
            .withClaim("providerSubscriptionId", providerSubscriptionId)
            .withClaim("planCode", plan.canonicalCode())
            .withIssuedAt(new Date())
            .withExpiresAt(Date.from(Instant.now().plus(2, ChronoUnit.HOURS)));
        return tokenBuilder.sign(tokenAlgorithm);
    }

    private CheckoutToken verifyCheckoutToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "checkoutToken es obligatorio");
        }
        try {
            JWTVerifier verifier = JWT.require(tokenAlgorithm)
                .withIssuer(jwtIssuer)
                .withClaim("typ", TOKEN_TYPE)
                .build();
            DecodedJWT decoded = verifier.verify(rawToken);
            String providerSubscriptionId = decoded.getClaim("providerSubscriptionId").asString();
            String email = normalizeEmail(decoded.getClaim("email").asString());
            SubscriptionPlanCode plan = SubscriptionPlanCode.fromCode(decoded.getClaim("planCode").asString());
            if (providerSubscriptionId == null || providerSubscriptionId.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "checkoutToken inválido");
            }
            return new CheckoutToken(providerSubscriptionId, email, plan);
        } catch (JWTVerificationException | IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "checkoutToken inválido");
        }
    }

    private void ensureBillingEnabled() {
        if (!billingProperties.isEnabled() || !billingProperties.getMercadopago().isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Billing deshabilitado");
        }
    }

    private SubscriptionPlanCode resolveRequestedCorePlan(String rawPlanCode) {
        SubscriptionPlanCode plan;
        try {
            plan = SubscriptionPlanCode.fromCode(rawPlanCode);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
        if (plan != SubscriptionPlanCode.PLAN_CORE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo Plura Core puede iniciar suscripcion");
        }
        return plan;
    }

    private String normalizeEmail(String rawEmail) {
        if (rawEmail == null || rawEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email es obligatorio");
        }
        return rawEmail.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeReturnUrl(String rawReturnUrl) {
        if (rawReturnUrl == null || rawReturnUrl.isBlank()) {
            return null;
        }
        String value = rawReturnUrl.trim();
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "returnUrl inválida");
        }
        return value;
    }

    private String normalizeStatus(String rawStatus) {
        return rawStatus == null ? "" : rawStatus.trim().toLowerCase(Locale.ROOT);
    }

    private record CheckoutToken(String providerSubscriptionId, String email, SubscriptionPlanCode plan) {}
}

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
import com.plura.plurabackend.core.billing.registration.ProfessionalRegistrationCheckoutIntent;
import com.plura.plurabackend.core.billing.registration.ProfessionalRegistrationCheckoutIntentRepository;
import com.plura.plurabackend.core.billing.registration.ProfessionalRegistrationCheckoutIntentStatus;
import com.plura.plurabackend.core.billing.subscriptions.model.Subscription;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionStatus;
import com.plura.plurabackend.core.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.core.billing.webhooks.ParsedWebhookEvent;
import com.plura.plurabackend.core.billing.webhooks.WebhookEventDomain;
import com.plura.plurabackend.core.professional.ProfessionalBillingSubjectGateway;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.Date;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfessionalRegistrationCheckoutService {

    private static final String TOKEN_TYPE = "professional_registration_checkout";
<<<<<<< HEAD
    private static final Duration CHECKOUT_TOKEN_TTL = Duration.ofDays(7);
    private static final Duration CHECKOUT_TOKEN_RECOVERY_LEEWAY = Duration.ofDays(30);
=======
    private static final long CHECKOUT_TOKEN_TTL_HOURS = 2;
    private static final String REGISTER_PATH = "/profesional/auth/register";
>>>>>>> b06abbb4 (arreglando registro de profesional con mercado pago)

    private final BillingProperties billingProperties;
    private final MercadoPagoSubscriptionService mercadoPagoSubscriptionService;
    private final SubscriptionRepository subscriptionRepository;
    private final ProfessionalRegistrationCheckoutIntentRepository checkoutIntentRepository;
    private final ProfessionalBillingSubjectGateway professionalBillingSubjectGateway;
    private final RoleGuard roleGuard;
    private final UserRepository userRepository;
    private final Algorithm tokenAlgorithm;
    private final String jwtIssuer;

    public ProfessionalRegistrationCheckoutService(
        BillingProperties billingProperties,
        MercadoPagoSubscriptionService mercadoPagoSubscriptionService,
        SubscriptionRepository subscriptionRepository,
        ProfessionalRegistrationCheckoutIntentRepository checkoutIntentRepository,
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
        this.checkoutIntentRepository = checkoutIntentRepository;
        this.professionalBillingSubjectGateway = professionalBillingSubjectGateway;
        this.roleGuard = roleGuard;
        this.userRepository = userRepository;
        this.tokenAlgorithm = Algorithm.HMAC256(tokenSecret);
        this.jwtIssuer = jwtIssuer;
    }

    @Transactional
    public ProfessionalRegistrationCheckoutResponse startCheckout(ProfessionalRegistrationCheckoutRequest request) {
        ensureBillingEnabled();
        SubscriptionPlanCode plan = resolveRequestedCorePlan(request.getPlanCode());
        BillingProperties.PlanConfig planConfig = billingProperties.resolvePlan(plan);
        String email = normalizeEmail(request.getEmail());
        ensureEmailDoesNotHaveActiveProfessional(email);

        String checkoutRef = UUID.randomUUID().toString().replace("-", "");
        String registrationReference = "professional-registration:" + checkoutRef;
        ProfessionalRegistrationCheckoutIntent intent = new ProfessionalRegistrationCheckoutIntent();
        intent.setCheckoutRef(checkoutRef);
        intent.setEmail(email);
        intent.setPlanCode(plan);
        intent.setRegistrationReference(registrationReference);
        intent.setProvider(PaymentProvider.MERCADOPAGO);
        intent.setStatus(ProfessionalRegistrationCheckoutIntentStatus.CREATED);
        intent.setExpiresAt(LocalDateTime.now().plus(CHECKOUT_TOKEN_TTL_HOURS, ChronoUnit.HOURS));
        checkoutIntentRepository.saveAndFlush(intent);

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
                    buildReturnUrlWithCheckoutRef(request.getReturnUrl(), checkoutRef)
                )
            );

        intent.setCheckoutUrl(blankToNull(session.checkoutUrl()));
        intent.setProviderSubscriptionId(blankToNull(session.providerSubscriptionId()));
        intent.setPreapprovalPlanId(blankToNull(session.preapprovalPlanId()));
        intent.setStatus(hasText(intent.getCheckoutUrl())
            ? ProfessionalRegistrationCheckoutIntentStatus.CHECKOUT_OPENED
            : ProfessionalRegistrationCheckoutIntentStatus.PENDING);

        if (!hasText(intent.getCheckoutUrl()) && !hasText(intent.getProviderSubscriptionId())) {
            intent.setStatus(ProfessionalRegistrationCheckoutIntentStatus.EXPIRED);
            checkoutIntentRepository.saveAndFlush(intent);
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Mercado Pago no devolvio checkout para autorizar la suscripcion. Reintenta la activacion."
            );
        }

        checkoutIntentRepository.saveAndFlush(intent);
        String checkoutToken = buildCheckoutToken(intent, intent.getProviderSubscriptionId());
        return buildIntentResponse(intent, checkoutToken, false);
    }

<<<<<<< HEAD
    public ProfessionalRegistrationCheckoutResponse verifyCheckout(String checkoutToken) {
        return verifyCheckout(checkoutToken, null);
    }

    public ProfessionalRegistrationCheckoutResponse verifyCheckout(String checkoutToken, String providerSubscriptionId) {
        CheckoutToken token = verifyCheckoutToken(checkoutToken);
        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot = resolveCheckoutSnapshot(token, providerSubscriptionId);
        String status = snapshot == null ? "" : normalizeStatus(snapshot.status());
        boolean confirmed = isConfirmedSubscriptionStatus(status) && hasText(snapshot.providerSubscriptionId());
        String responseToken = confirmed && !hasText(token.providerSubscriptionId())
            ? buildCheckoutToken(
                token.email(),
                snapshot.providerSubscriptionId(),
                token.registrationReference(),
                token.preapprovalPlanId(),
                token.plan()
            )
            : checkoutToken;
=======
    @Transactional
    public ProfessionalRegistrationCheckoutResponse verifyCheckout(String checkoutToken, String checkoutRef) {
        if (!hasText(checkoutToken) && !hasText(checkoutRef)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "checkoutToken o checkoutRef es obligatorio");
        }
>>>>>>> b06abbb4 (arreglando registro de profesional con mercado pago)

        CheckoutToken token = hasText(checkoutToken) ? verifyCheckoutToken(checkoutToken) : null;
        ProfessionalRegistrationCheckoutIntent intent = resolveIntentForUpdate(checkoutRef, token).orElse(null);
        if (intent == null) {
            if (token == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Checkout no encontrado");
            }
            return verifyLegacyToken(checkoutToken, token);
        }
        ensureTokenMatchesIntent(token, intent);

        if (isExpired(intent)) {
            intent.setStatus(ProfessionalRegistrationCheckoutIntentStatus.EXPIRED);
            checkoutIntentRepository.saveAndFlush(intent);
            return buildIntentResponse(intent, checkoutToken, false);
        }

        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot = resolveSnapshotForIntent(intent, token);
        applySnapshotToIntent(intent, snapshot);
        checkoutIntentRepository.saveAndFlush(intent);

        boolean confirmed = intent.getStatus() == ProfessionalRegistrationCheckoutIntentStatus.CONFIRMED
            && hasText(intent.getProviderSubscriptionId());
        String responseToken = confirmed || hasText(intent.getProviderSubscriptionId())
            ? buildCheckoutToken(intent, intent.getProviderSubscriptionId())
            : checkoutToken;
        return buildIntentResponse(intent, responseToken, confirmed);
    }

    public void requireConfirmedCheckoutForEmail(String checkoutToken, String rawEmail) {
        CheckoutToken token = verifyCheckoutToken(checkoutToken);
        String expectedEmail = normalizeEmail(rawEmail);
        if (!expectedEmail.equals(token.email())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El checkout confirmado no pertenece a este email");
        }
        requireConfirmedSnapshot(token);
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Perfil profesional invalido");
        }
        CheckoutToken token = verifyCheckoutToken(checkoutToken);
        ProfessionalRegistrationCheckoutIntent intent = findIntentForTokenForUpdate(token).orElse(null);
        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot = requireConfirmedSnapshot(token);
        String providerSubscriptionId = snapshot.providerSubscriptionId();

        String professionalEmail = professional.getUser() == null ? null : normalizeEmail(professional.getUser().getEmail());
        if (professionalEmail == null || !professionalEmail.equals(token.email())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El checkout confirmado no pertenece a este profesional");
        }
        BillingProperties.PlanConfig planConfig = billingProperties.resolvePlan(token.plan());
        LocalDateTime now = LocalDateTime.now();
        Subscription subscription = subscriptionRepository
            .findByProviderAndProviderSubscriptionIdForUpdate(PaymentProvider.MERCADOPAGO, providerSubscriptionId)
            .orElse(null);
        if (subscription != null && !professional.getId().equals(subscription.getProfessionalId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La suscripcion ya esta asociada a otro profesional");
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
        subscription.setProviderSubscriptionId(providerSubscriptionId);
        subscription.setPaymentMethodAttachedAt(now);
        subscription.setCurrentPeriodStart(now);
        subscription.setCurrentPeriodEnd(now.plusMonths(1));
        subscription.setCancelAtPeriodEnd(false);
        subscriptionRepository.saveAndFlush(subscription);

        if (intent != null) {
            intent.setProviderSubscriptionId(providerSubscriptionId);
            intent.setStatus(ProfessionalRegistrationCheckoutIntentStatus.CONFIRMED);
            checkoutIntentRepository.saveAndFlush(intent);
        }

        return new ProfessionalRegistrationCheckoutResponse(
            null,
            hasText(token.providerSubscriptionId()) ? checkoutToken : buildCheckoutToken(token, providerSubscriptionId),
            token.checkoutRef(),
            "MERCADOPAGO",
            token.plan().canonicalCode(),
            "ACTIVE",
            null,
            null,
            false,
            true
        );
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void applyMercadoPagoWebhookEvent(ParsedWebhookEvent event) {
        if (event == null
            || event.provider() != PaymentProvider.MERCADOPAGO
            || event.domain() != WebhookEventDomain.SUBSCRIPTION) {
            return;
        }

        ProfessionalRegistrationCheckoutIntent intent = null;
        if (hasText(event.providerSubscriptionId())) {
            intent = checkoutIntentRepository
                .findByProviderAndProviderSubscriptionIdForUpdate(
                    PaymentProvider.MERCADOPAGO,
                    event.providerSubscriptionId().trim()
                )
                .orElse(null);
        }
        if (intent == null && hasText(event.orderReference())
            && event.orderReference().startsWith("professional-registration:")) {
            intent = checkoutIntentRepository
                .findByRegistrationReferenceForUpdate(event.orderReference().trim())
                .orElse(null);
        }
        if (intent == null) {
            return;
        }
        if (hasText(event.providerSubscriptionId())) {
            intent.setProviderSubscriptionId(event.providerSubscriptionId().trim());
        }

        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot = resolveSnapshotForIntent(intent, null);
        applySnapshotToIntent(intent, snapshot);
        checkoutIntentRepository.saveAndFlush(intent);
    }

    private ProfessionalRegistrationCheckoutResponse verifyLegacyToken(String checkoutToken, CheckoutToken token) {
        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot = resolveCheckoutSnapshot(token);
        String status = snapshot == null ? "" : normalizeStatus(snapshot.status());
        boolean confirmed = isConfirmedSubscriptionStatus(status) && hasText(snapshot.providerSubscriptionId());
        String responseToken = confirmed && !hasText(token.providerSubscriptionId())
            ? buildCheckoutToken(token, snapshot.providerSubscriptionId())
            : checkoutToken;

        return new ProfessionalRegistrationCheckoutResponse(
            null,
            responseToken,
            token.checkoutRef(),
            "MERCADOPAGO",
            token.plan().canonicalCode(),
            confirmed ? "ACTIVE" : "CHECKOUT_PENDING",
            null,
            null,
            false,
            confirmed
        );
    }

    private ProfessionalRegistrationCheckoutResponse buildIntentResponse(
        ProfessionalRegistrationCheckoutIntent intent,
        String checkoutToken,
        boolean confirmed
    ) {
        boolean requiresCheckout = !confirmed
            && !isTerminalIntentStatus(intent.getStatus())
            && hasText(intent.getCheckoutUrl());
        return new ProfessionalRegistrationCheckoutResponse(
            requiresCheckout ? intent.getCheckoutUrl() : null,
            checkoutToken,
            intent.getCheckoutRef(),
            intent.getProvider().name(),
            intent.getPlanCode().canonicalCode(),
            responseStatusForIntent(intent.getStatus()),
            null,
            null,
            requiresCheckout,
            confirmed
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
                "Ya existe una cuenta profesional con este email. Inicia sesion."
            );
        }
    }

    private String buildCheckoutToken(ProfessionalRegistrationCheckoutIntent intent, String providerSubscriptionId) {
        return buildCheckoutToken(
            intent.getEmail(),
            providerSubscriptionId,
            intent.getRegistrationReference(),
            intent.getPreapprovalPlanId(),
            intent.getCheckoutRef(),
            intent.getPlanCode()
        );
    }

    private String buildCheckoutToken(CheckoutToken token, String providerSubscriptionId) {
        return buildCheckoutToken(
            token.email(),
            providerSubscriptionId,
            token.registrationReference(),
            token.preapprovalPlanId(),
            token.checkoutRef(),
            token.plan()
        );
    }

    private String buildCheckoutToken(
        String email,
        String providerSubscriptionId,
        String registrationReference,
        String preapprovalPlanId,
        String checkoutRef,
        SubscriptionPlanCode plan
    ) {
        JWTCreator.Builder tokenBuilder = JWT.create()
            .withIssuer(jwtIssuer)
            .withSubject(email)
            .withClaim("typ", TOKEN_TYPE)
            .withClaim("email", email)
            .withClaim("provider", "MERCADOPAGO")
            .withClaim("planCode", plan.canonicalCode())
            .withIssuedAt(new Date())
<<<<<<< HEAD
            .withExpiresAt(Date.from(Instant.now().plus(CHECKOUT_TOKEN_TTL)));
=======
            .withExpiresAt(Date.from(Instant.now().plus(CHECKOUT_TOKEN_TTL_HOURS, ChronoUnit.HOURS)));
>>>>>>> b06abbb4 (arreglando registro de profesional con mercado pago)
        if (hasText(providerSubscriptionId)) {
            tokenBuilder.withClaim("providerSubscriptionId", providerSubscriptionId.trim());
        }
        if (hasText(registrationReference)) {
            tokenBuilder.withClaim("registrationReference", registrationReference.trim());
        }
        if (hasText(preapprovalPlanId)) {
            tokenBuilder.withClaim("preapprovalPlanId", preapprovalPlanId.trim());
        }
        if (hasText(checkoutRef)) {
            tokenBuilder.withClaim("checkoutRef", checkoutRef.trim());
        }
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
                .acceptExpiresAt(CHECKOUT_TOKEN_RECOVERY_LEEWAY.toSeconds())
                .build();
            DecodedJWT decoded = verifier.verify(rawToken);
            String providerSubscriptionId = decoded.getClaim("providerSubscriptionId").asString();
            String registrationReference = decoded.getClaim("registrationReference").asString();
            String preapprovalPlanId = decoded.getClaim("preapprovalPlanId").asString();
            String checkoutRef = decoded.getClaim("checkoutRef").asString();
            String email = normalizeEmail(decoded.getClaim("email").asString());
            SubscriptionPlanCode plan = SubscriptionPlanCode.fromCode(decoded.getClaim("planCode").asString());
            if (!hasText(providerSubscriptionId) && !hasText(registrationReference) && !hasText(checkoutRef)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "checkoutToken invalido");
            }
            return new CheckoutToken(
                blankToNull(providerSubscriptionId),
                blankToNull(registrationReference),
                blankToNull(preapprovalPlanId),
                blankToNull(checkoutRef),
                email,
                plan,
                decoded.getIssuedAt() == null ? null : decoded.getIssuedAt().toInstant()
            );
        } catch (JWTVerificationException | IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "checkoutToken invalido");
        }
    }

    private MercadoPagoSubscriptionService.SubscriptionSnapshot requireConfirmedSnapshot(CheckoutToken token) {
<<<<<<< HEAD
        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot = resolveCheckoutSnapshot(token, null);
=======
        ProfessionalRegistrationCheckoutIntent intent = findIntentForTokenForUpdate(token).orElse(null);
        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot = intent == null
            ? resolveCheckoutSnapshot(token)
            : resolveSnapshotForIntent(intent, token);
        if (intent != null) {
            applySnapshotToIntent(intent, snapshot);
            checkoutIntentRepository.saveAndFlush(intent);
        }
>>>>>>> b06abbb4 (arreglando registro de profesional con mercado pago)
        if (snapshot == null
            || !hasText(snapshot.providerSubscriptionId())
            || !isConfirmedSubscriptionStatus(normalizeStatus(snapshot.status()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mercado Pago todavia no confirmo la suscripcion");
        }
        return snapshot;
    }

    private MercadoPagoSubscriptionService.SubscriptionSnapshot resolveCheckoutSnapshot(
        CheckoutToken token,
        String explicitProviderSubscriptionId
    ) {
        String explicitId = normalizeOptionalText(explicitProviderSubscriptionId);
        if (hasText(explicitId)) {
            if (hasText(token.providerSubscriptionId()) && !explicitId.equals(token.providerSubscriptionId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "providerSubscriptionId no coincide con el checkout");
            }
            MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot =
                mercadoPagoSubscriptionService.getSubscription(explicitId);
            ensureSnapshotCompatibleWithCheckout(token, snapshot);
            return snapshot;
        }
        if (hasText(token.providerSubscriptionId())) {
            return mercadoPagoSubscriptionService.getSubscription(token.providerSubscriptionId());
        }
        if (!hasText(token.registrationReference())) {
            return null;
        }
        return mercadoPagoSubscriptionService
            .findSubscriptionByRegistrationReference(
                token.registrationReference(),
                token.email(),
                token.preapprovalPlanId(),
                token.issuedAt()
            )
            .orElse(null);
    }

<<<<<<< HEAD
    private void ensureSnapshotCompatibleWithCheckout(
        CheckoutToken token,
        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot
    ) {
        if (snapshot == null || !hasText(snapshot.providerSubscriptionId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mercado Pago todavÃ­a no confirmÃ³ la suscripciÃ³n");
        }
        if (hasText(token.registrationReference())
            && hasText(snapshot.externalReference())
            && !token.registrationReference().equals(snapshot.externalReference())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La suscripciÃ³n no pertenece a este checkout");
        }
        if (hasText(token.preapprovalPlanId())
            && hasText(snapshot.preapprovalPlanId())
            && !token.preapprovalPlanId().equals(snapshot.preapprovalPlanId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La suscripciÃ³n no pertenece al plan confirmado");
=======
    private MercadoPagoSubscriptionService.SubscriptionSnapshot resolveSnapshotForIntent(
        ProfessionalRegistrationCheckoutIntent intent,
        CheckoutToken token
    ) {
        String providerSubscriptionId = firstText(
            intent.getProviderSubscriptionId(),
            token == null ? null : token.providerSubscriptionId()
        );
        if (hasText(providerSubscriptionId)) {
            return mercadoPagoSubscriptionService.getSubscription(providerSubscriptionId);
        }
        return mercadoPagoSubscriptionService
            .findSubscriptionByRegistrationReference(
                intent.getRegistrationReference(),
                intent.getEmail(),
                intent.getPreapprovalPlanId()
            )
            .orElse(null);
    }

    private void applySnapshotToIntent(
        ProfessionalRegistrationCheckoutIntent intent,
        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot
    ) {
        if (snapshot == null) {
            if (intent.getStatus() == ProfessionalRegistrationCheckoutIntentStatus.CREATED
                || intent.getStatus() == ProfessionalRegistrationCheckoutIntentStatus.CHECKOUT_OPENED) {
                intent.setStatus(ProfessionalRegistrationCheckoutIntentStatus.PENDING);
            }
            return;
        }
        if (hasText(snapshot.providerSubscriptionId())) {
            intent.setProviderSubscriptionId(snapshot.providerSubscriptionId().trim());
        }
        String status = normalizeStatus(snapshot.status());
        if (isConfirmedSubscriptionStatus(status) && hasText(intent.getProviderSubscriptionId())) {
            intent.setStatus(ProfessionalRegistrationCheckoutIntentStatus.CONFIRMED);
        } else if ("rejected".equals(status)) {
            intent.setStatus(ProfessionalRegistrationCheckoutIntentStatus.REJECTED);
        } else if ("cancelled".equals(status) || "canceled".equals(status) || "cancelled_by_user".equals(status)) {
            intent.setStatus(ProfessionalRegistrationCheckoutIntentStatus.CANCELLED);
        } else if ("expired".equals(status)) {
            intent.setStatus(ProfessionalRegistrationCheckoutIntentStatus.EXPIRED);
        } else if (!isTerminalIntentStatus(intent.getStatus())) {
            intent.setStatus(ProfessionalRegistrationCheckoutIntentStatus.PENDING);
        }
    }

    private Optional<ProfessionalRegistrationCheckoutIntent> resolveIntentForUpdate(
        String checkoutRef,
        CheckoutToken token
    ) {
        if (hasText(checkoutRef)) {
            return checkoutIntentRepository.findByCheckoutRefForUpdate(checkoutRef.trim());
        }
        return findIntentForTokenForUpdate(token);
    }

    private Optional<ProfessionalRegistrationCheckoutIntent> findIntentForTokenForUpdate(CheckoutToken token) {
        if (token == null) {
            return Optional.empty();
        }
        if (hasText(token.checkoutRef())) {
            Optional<ProfessionalRegistrationCheckoutIntent> byRef =
                checkoutIntentRepository.findByCheckoutRefForUpdate(token.checkoutRef());
            if (byRef.isPresent()) {
                return byRef;
            }
        }
        if (hasText(token.registrationReference())) {
            return checkoutIntentRepository.findByRegistrationReferenceForUpdate(token.registrationReference());
        }
        return Optional.empty();
    }

    private void ensureTokenMatchesIntent(CheckoutToken token, ProfessionalRegistrationCheckoutIntent intent) {
        if (token == null) {
            return;
        }
        if (!intent.getEmail().equals(token.email())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El checkoutToken no pertenece al checkoutRef");
        }
        if (hasText(token.checkoutRef()) && !intent.getCheckoutRef().equals(token.checkoutRef())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El checkoutToken no pertenece al checkoutRef");
        }
        if (hasText(token.registrationReference())
            && !intent.getRegistrationReference().equals(token.registrationReference())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El checkoutToken no pertenece al checkoutRef");
>>>>>>> b06abbb4 (arreglando registro de profesional con mercado pago)
        }
    }

    private boolean isConfirmedSubscriptionStatus(String status) {
        return "authorized".equals(status)
            || "active".equals(status)
            || "trial".equals(status)
            || "trialing".equals(status);
    }

    private boolean isTerminalIntentStatus(ProfessionalRegistrationCheckoutIntentStatus status) {
        return status == ProfessionalRegistrationCheckoutIntentStatus.CONFIRMED
            || status == ProfessionalRegistrationCheckoutIntentStatus.REJECTED
            || status == ProfessionalRegistrationCheckoutIntentStatus.CANCELLED
            || status == ProfessionalRegistrationCheckoutIntentStatus.EXPIRED;
    }

    private String responseStatusForIntent(ProfessionalRegistrationCheckoutIntentStatus status) {
        if (status == ProfessionalRegistrationCheckoutIntentStatus.CONFIRMED) {
            return "ACTIVE";
        }
        if (status == ProfessionalRegistrationCheckoutIntentStatus.REJECTED) {
            return "REJECTED";
        }
        if (status == ProfessionalRegistrationCheckoutIntentStatus.CANCELLED) {
            return "CANCELLED";
        }
        if (status == ProfessionalRegistrationCheckoutIntentStatus.EXPIRED) {
            return "EXPIRED";
        }
        return "CHECKOUT_PENDING";
    }

    private boolean isExpired(ProfessionalRegistrationCheckoutIntent intent) {
        return intent.getExpiresAt() != null
            && intent.getExpiresAt().isBefore(LocalDateTime.now())
            && !isTerminalIntentStatus(intent.getStatus());
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

    private String buildReturnUrlWithCheckoutRef(String rawReturnUrl, String checkoutRef) {
        String value = hasText(rawReturnUrl)
            ? rawReturnUrl.trim()
            : blankToNull(billingProperties.getMercadopago().getSubscriptionBackUrl());
        if (!hasText(value)) {
            return null;
        }
        try {
            URI uri = new URI(value);
            if (!"http".equals(uri.getScheme()) && !"https".equals(uri.getScheme())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "returnUrl invalida");
            }
            if (!REGISTER_PATH.equals(uri.getPath())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "returnUrl invalida");
            }
            String allowedOrigin = configuredReturnOrigin();
            if (hasText(allowedOrigin) && !allowedOrigin.equals(originOf(uri))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "returnUrl invalida");
            }
            String query = appendQuery(uri.getQuery(), "billingReturn=1");
            query = appendQuery(query, "checkoutRef=" + checkoutRef);
            return new URI(uri.getScheme(), uri.getAuthority(), uri.getPath(), query, uri.getFragment()).toString();
        } catch (URISyntaxException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "returnUrl invalida");
        }
    }

    private String configuredReturnOrigin() {
        String configuredUrl = blankToNull(billingProperties.getMercadopago().getSubscriptionBackUrl());
        if (!hasText(configuredUrl)) {
            return null;
        }
        try {
            return originOf(new URI(configuredUrl.trim()));
        } catch (URISyntaxException exception) {
            return null;
        }
    }

    private String originOf(URI uri) {
        if (uri == null || uri.getScheme() == null || uri.getAuthority() == null) {
            return null;
        }
        return uri.getScheme() + "://" + uri.getAuthority();
    }

    private String appendQuery(String currentQuery, String item) {
        return hasText(currentQuery) ? currentQuery + "&" + item : item;
    }

    private String normalizeStatus(String rawStatus) {
        return rawStatus == null ? "" : rawStatus.trim().toLowerCase(Locale.ROOT);
    }

<<<<<<< HEAD
    private String normalizeOptionalText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
=======
    private String firstText(String first, String second) {
        return hasText(first) ? first.trim() : blankToNull(second);
    }

    private String blankToNull(String value) {
        return hasText(value) ? value.trim() : null;
>>>>>>> b06abbb4 (arreglando registro de profesional con mercado pago)
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record CheckoutToken(
        String providerSubscriptionId,
        String registrationReference,
        String preapprovalPlanId,
        String checkoutRef,
        String email,
        SubscriptionPlanCode plan,
        Instant issuedAt
    ) {}
}

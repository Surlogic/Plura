package com.plura.plurabackend.core.billing;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.booking.model.BookingProcessingFeeMode;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.util.Locale;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Propiedades de configuración del módulo de facturación.
 * Se cargan desde el prefijo "billing" en application.properties/yml.
 * Contiene la configuración de planes y del proveedor Mercado Pago,
 * modo de operación (sandbox/production) y parámetros de seguridad para webhooks.
 */
@Component
@ConfigurationProperties(prefix = "billing")
public class BillingProperties {

    private boolean enabled = false;
    private String mode = "sandbox";
    private boolean providerVerificationEnabled = true;
    private long webhookAllowedSkewSeconds = 300L;
    private String webhookBaseUrl = "";
    private Plans plans = new Plans();
    private MercadoPago mercadopago = new MercadoPago();

    /**
     * Valida la configuración al iniciar la aplicación.
     * Verifica que los planes, proveedores y credenciales estén correctamente configurados.
     * Solo se ejecuta si billing está habilitado.
     */
    @PostConstruct
    void validate() {
        if (!enabled) {
            return;
        }
        if (webhookAllowedSkewSeconds <= 0) {
            throw new IllegalStateException("BILLING_WEBHOOK_ALLOWED_SKEW_SECONDS debe ser > 0");
        }

        validatePlan("PLAN_BASIC", plans.planBasic);
        validatePlan("PLAN_PROFESIONAL", plans.planProfesional);
        validatePlan("PLAN_ENTERPRISE", plans.planEnterprise);

        if (mercadopago.enabled) {
            requirePresent(
                mercadopago.getSubscriptions().getAccessToken(),
                "BILLING_MERCADOPAGO_SUBSCRIPTIONS_ACCESS_TOKEN"
            );
            requirePresent(
                mercadopago.getSubscriptions().getWebhookSecret(),
                "BILLING_MERCADOPAGO_SUBSCRIPTIONS_WEBHOOK_SECRET"
            );
            validateProcessingFee(mercadopago.getReservations().getProcessingFee());
        }
    }

    /**
     * Verifica si un proveedor de pagos específico está habilitado.
     *
     * @param provider el proveedor a verificar
     * @return true si el proveedor está habilitado
     */
    public boolean isProviderEnabled(PaymentProvider provider) {
        return provider == PaymentProvider.MERCADOPAGO && mercadopago.enabled;
    }

    /**
     * Resuelve la configuración de un plan de suscripción.
     *
     * @param plan el plan a resolver (BASIC, PROFESIONAL o ENTERPRISE)
     * @return la configuración del plan con precio y moneda
     */
    public PlanConfig resolvePlan(SubscriptionPlanCode plan) {
        return switch (plan) {
            case PLAN_BASIC -> plans.planBasic;
            case PLAN_PROFESIONAL -> plans.planProfesional;
            case PLAN_ENTERPRISE -> plans.planEnterprise;
        };
    }

    /**
     * Indica si el sistema está en modo producción.
     *
     * @return true si el modo es "production"
     */
    public boolean isProductionMode() {
        return "production".equalsIgnoreCase(mode);
    }

    /**
     * Valida la configuración de un plan individual.
     * Verifica que tenga precio válido y moneda configurada.
     * El PLAN_BASIC puede tener precio cero; los demás deben tener precio mayor a cero.
     */
    private void validatePlan(String name, PlanConfig plan) {
        if (plan == null) {
            throw new IllegalStateException("Plan faltante: " + name);
        }
        if (plan.price == null) {
            throw new IllegalStateException(name + " requiere precio");
        }
        boolean allowFreePlan = "PLAN_BASIC".equals(name);
        if ((!allowFreePlan && plan.price.compareTo(BigDecimal.ZERO) <= 0)
            || (allowFreePlan && plan.price.compareTo(BigDecimal.ZERO) < 0)) {
            throw new IllegalStateException(name + " tiene precio invalido");
        }
        requirePresent(plan.currency, name + " currency");
    }

    /**
     * Resuelve el ID del plan en MercadoPago según el plan de suscripción interno.
     *
     * @param plan el plan de suscripción
     * @return el ID del plan configurado en MercadoPago
     */
    public String resolveMercadoPagoPlanId(SubscriptionPlanCode plan) {
        return switch (plan) {
            case PLAN_BASIC -> mercadopago.planBasicId;
            case PLAN_PROFESIONAL -> mercadopago.planProfesionalId;
            case PLAN_ENTERPRISE -> mercadopago.planEnterpriseId;
        };
    }

    private void requirePresent(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(fieldName + " no está configurado");
        }
    }

    private void validateProcessingFee(MercadoPago.ProcessingFee processingFee) {
        if (processingFee == null || !processingFee.isEnabled()) {
            return;
        }
        if (processingFee.getInstantProviderFeePercent().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_INSTANT_PROVIDER_FEE_PERCENT no puede ser negativo");
        }
        if (processingFee.getDelayedProviderFeePercent().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_DELAYED_PROVIDER_FEE_PERCENT no puede ser negativo");
        }
        if (processingFee.getTaxPercent().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_TAX_PERCENT no puede ser negativo");
        }
        if (processingFee.getPlatformFeePercent().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_PLATFORM_FEE_PERCENT no puede ser negativo");
        }
        for (BookingProcessingFeeMode mode : BookingProcessingFeeMode.values()) {
            BigDecimal effectivePercent = processingFee.resolveProviderFeePercent(mode)
                .multiply(BigDecimal.ONE.add(processingFee.getTaxPercent().divide(BigDecimal.valueOf(100), 8, java.math.RoundingMode.HALF_UP)))
                .add(processingFee.getPlatformFeePercent());
            if (effectivePercent.compareTo(BigDecimal.valueOf(100)) >= 0) {
                throw new IllegalStateException("El cargo de procesamiento configurado deja un porcentaje efectivo inválido");
            }
        }
    }

    /**
     * Contenedor de la configuración de los tres planes de suscripción disponibles.
     */
    public static class Plans {
        private PlanConfig planBasic = new PlanConfig();
        private PlanConfig planProfesional = new PlanConfig();
        private PlanConfig planEnterprise = new PlanConfig();

        public PlanConfig getPlanBasic() {
            return planBasic;
        }

        public void setPlanBasic(PlanConfig planBasic) {
            this.planBasic = planBasic;
        }

        public PlanConfig getPlanProfesional() {
            return planProfesional;
        }

        public void setPlanProfesional(PlanConfig planProfesional) {
            this.planProfesional = planProfesional;
        }

        public PlanConfig getPlanEnterprise() {
            return planEnterprise;
        }

        public void setPlanEnterprise(PlanConfig planEnterprise) {
            this.planEnterprise = planEnterprise;
        }
    }

    /**
     * Configuración individual de un plan de suscripción.
     * Define el precio y la moneda del plan.
     */
    public static class PlanConfig {
        private BigDecimal price = BigDecimal.ZERO;
        private String currency = "UYU";

        public BigDecimal getPrice() {
            return price;
        }

        public void setPrice(BigDecimal price) {
            this.price = price;
        }

        public String getCurrency() {
            return currency;
        }

        public void setCurrency(String currency) {
            this.currency = currency == null ? "UYU" : currency.trim().toUpperCase(Locale.ROOT);
        }
    }

    /**
     * Configuración específica del proveedor MercadoPago.
     * Incluye credenciales, URLs de la API, rutas de endpoints,
     * IDs de planes y configuración de sandbox.
     */
    public static class MercadoPago {
        private boolean enabled = false;
        private String baseUrl = "https://api.mercadopago.com";
        private String preapprovalPlanPath = "/preapproval_plan";
        private String preapprovalPath = "/preapproval";
        private String cancelPath = "/preapproval/{id}";
        private String subscriptionStatusPath = "/preapproval/{id}";
        private String reservationPreferencePath = "/checkout/preferences";
        private String reservationPaymentStatusPath = "/v1/payments/{id}";
        private String reservationPaymentSearchPath = "/v1/payments/search";
        private String reservationRefundPath = "/v1/payments/{id}/refunds";
        private boolean sandboxOnlyBodySignatureFallback = false;
        private String subscriptionBackUrl = "";
        private String successUrl = "";
        private String failureUrl = "";
        private String pendingUrl = "";
        private String planBasicId = "";
        private String planProfesionalId = "";
        private String planEnterpriseId = "";
        private int timeoutMillis = 5000;
        private SubscriptionCredentials subscriptions = new SubscriptionCredentials();
        private Reservations reservations = new Reservations();

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public SubscriptionCredentials getSubscriptions() {
            return subscriptions;
        }

        public void setSubscriptions(SubscriptionCredentials subscriptions) {
            this.subscriptions = subscriptions == null ? new SubscriptionCredentials() : subscriptions;
        }

        public Reservations getReservations() {
            return reservations;
        }

        public void setReservations(Reservations reservations) {
            this.reservations = reservations == null ? new Reservations() : reservations;
        }

        public String getPreapprovalPlanPath() {
            return preapprovalPlanPath;
        }

        public void setPreapprovalPlanPath(String preapprovalPlanPath) {
            this.preapprovalPlanPath = preapprovalPlanPath;
        }

        public String getPreapprovalPath() {
            return preapprovalPath;
        }

        public void setPreapprovalPath(String preapprovalPath) {
            this.preapprovalPath = preapprovalPath;
        }

        public String getCancelPath() {
            return cancelPath;
        }

        public void setCancelPath(String cancelPath) {
            this.cancelPath = cancelPath;
        }

        public String getSubscriptionStatusPath() {
            return subscriptionStatusPath;
        }

        public void setSubscriptionStatusPath(String subscriptionStatusPath) {
            this.subscriptionStatusPath = subscriptionStatusPath;
        }

        public String getReservationPreferencePath() {
            return reservationPreferencePath;
        }

        public void setReservationPreferencePath(String reservationPreferencePath) {
            this.reservationPreferencePath = reservationPreferencePath;
        }

        public String getReservationPaymentStatusPath() {
            return reservationPaymentStatusPath;
        }

        public void setReservationPaymentStatusPath(String reservationPaymentStatusPath) {
            this.reservationPaymentStatusPath = reservationPaymentStatusPath;
        }

        public String getReservationPaymentSearchPath() {
            return reservationPaymentSearchPath;
        }

        public void setReservationPaymentSearchPath(String reservationPaymentSearchPath) {
            this.reservationPaymentSearchPath = reservationPaymentSearchPath;
        }

        public String getReservationRefundPath() {
            return reservationRefundPath;
        }

        public void setReservationRefundPath(String reservationRefundPath) {
            this.reservationRefundPath = reservationRefundPath;
        }

        public boolean isSandboxOnlyBodySignatureFallback() {
            return sandboxOnlyBodySignatureFallback;
        }

        public void setSandboxOnlyBodySignatureFallback(boolean sandboxOnlyBodySignatureFallback) {
            this.sandboxOnlyBodySignatureFallback = sandboxOnlyBodySignatureFallback;
        }

        public String getSubscriptionBackUrl() {
            return subscriptionBackUrl;
        }

        public void setSubscriptionBackUrl(String subscriptionBackUrl) {
            this.subscriptionBackUrl = subscriptionBackUrl;
        }

        public String getSuccessUrl() {
            return successUrl;
        }

        public void setSuccessUrl(String successUrl) {
            this.successUrl = successUrl;
        }

        public String getFailureUrl() {
            return failureUrl;
        }

        public void setFailureUrl(String failureUrl) {
            this.failureUrl = failureUrl;
        }

        public String getPendingUrl() {
            return pendingUrl;
        }

        public void setPendingUrl(String pendingUrl) {
            this.pendingUrl = pendingUrl;
        }

        public String getPlanBasicId() {
            return planBasicId;
        }

        public void setPlanBasicId(String planBasicId) {
            this.planBasicId = planBasicId;
        }

        public String getPlanProfesionalId() {
            return planProfesionalId;
        }

        public void setPlanProfesionalId(String planProfesionalId) {
            this.planProfesionalId = planProfesionalId;
        }

        public String getPlanEnterpriseId() {
            return planEnterpriseId;
        }

        public void setPlanEnterpriseId(String planEnterpriseId) {
            this.planEnterpriseId = planEnterpriseId;
        }

        public int getTimeoutMillis() {
            return timeoutMillis;
        }

        public void setTimeoutMillis(int timeoutMillis) {
            this.timeoutMillis = timeoutMillis;
        }

        public static class SubscriptionCredentials {
            private String accessToken = "";
            private String webhookSecret = "";

            public String getAccessToken() {
                return accessToken;
            }

            public void setAccessToken(String accessToken) {
                this.accessToken = accessToken;
            }

            public String getWebhookSecret() {
                return webhookSecret;
            }

            public void setWebhookSecret(String webhookSecret) {
                this.webhookSecret = webhookSecret;
            }
        }

        public static class Reservations {
            private String platformAccessToken = "";
            private String webhookSecret = "";
            private ProcessingFee processingFee = new ProcessingFee();
            private OAuth oauth = new OAuth();

            public String getPlatformAccessToken() {
                return platformAccessToken;
            }

            public void setPlatformAccessToken(String platformAccessToken) {
                this.platformAccessToken = platformAccessToken;
            }

            public String getWebhookSecret() {
                return webhookSecret;
            }

            public void setWebhookSecret(String webhookSecret) {
                this.webhookSecret = webhookSecret;
            }

            public ProcessingFee getProcessingFee() {
                return processingFee;
            }

            public void setProcessingFee(ProcessingFee processingFee) {
                this.processingFee = processingFee == null ? new ProcessingFee() : processingFee;
            }

            public OAuth getOauth() {
                return oauth;
            }

            public void setOauth(OAuth oauth) {
                this.oauth = oauth == null ? new OAuth() : oauth;
            }

        }

        public static class ProcessingFee {
            private boolean enabled = false;
            private String label = "Cargo de procesamiento";
            private BigDecimal instantProviderFeePercent = BigDecimal.ZERO;
            private BigDecimal delayedProviderFeePercent = BigDecimal.ZERO;
            private BigDecimal taxPercent = BigDecimal.ZERO;
            private BigDecimal platformFeePercent = BigDecimal.ZERO;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public String getLabel() {
                return label;
            }

            public void setLabel(String label) {
                this.label = label == null || label.isBlank() ? "Cargo de procesamiento" : label.trim();
            }

            public BigDecimal getInstantProviderFeePercent() {
                return instantProviderFeePercent;
            }

            public void setInstantProviderFeePercent(BigDecimal instantProviderFeePercent) {
                this.instantProviderFeePercent = instantProviderFeePercent == null ? BigDecimal.ZERO : instantProviderFeePercent;
            }

            public BigDecimal getDelayedProviderFeePercent() {
                return delayedProviderFeePercent;
            }

            public void setDelayedProviderFeePercent(BigDecimal delayedProviderFeePercent) {
                this.delayedProviderFeePercent = delayedProviderFeePercent == null ? BigDecimal.ZERO : delayedProviderFeePercent;
            }

            public BigDecimal getTaxPercent() {
                return taxPercent;
            }

            public void setTaxPercent(BigDecimal taxPercent) {
                this.taxPercent = taxPercent == null ? BigDecimal.ZERO : taxPercent;
            }

            public BigDecimal getPlatformFeePercent() {
                return platformFeePercent;
            }

            public void setPlatformFeePercent(BigDecimal platformFeePercent) {
                this.platformFeePercent = platformFeePercent == null ? BigDecimal.ZERO : platformFeePercent;
            }

            public BigDecimal resolveProviderFeePercent(BookingProcessingFeeMode mode) {
                return mode == BookingProcessingFeeMode.DELAYED_21_DAYS
                    ? delayedProviderFeePercent
                    : instantProviderFeePercent;
            }
        }

        public static class OAuth {
            private String clientId = "";
            private String clientSecret = "";
            private String redirectUri = "";
            private String frontendRedirectUrl = "";
            private String authorizationUrl = "https://auth.mercadopago.com/authorization";
            private String tokenUrl = "https://api.mercadopago.com/oauth/token";
            private String stateSigningSecret = "";
            private String tokenEncryptionKey = "";
            private boolean pkceEnabled = false;

            public String getClientId() {
                return clientId;
            }

            public void setClientId(String clientId) {
                this.clientId = clientId;
            }

            public String getClientSecret() {
                return clientSecret;
            }

            public void setClientSecret(String clientSecret) {
                this.clientSecret = clientSecret;
            }

            public String getRedirectUri() {
                return redirectUri;
            }

            public void setRedirectUri(String redirectUri) {
                this.redirectUri = redirectUri;
            }

            public String getFrontendRedirectUrl() {
                return frontendRedirectUrl;
            }

            public void setFrontendRedirectUrl(String frontendRedirectUrl) {
                this.frontendRedirectUrl = frontendRedirectUrl;
            }

            public String getAuthorizationUrl() {
                return authorizationUrl;
            }

            public void setAuthorizationUrl(String authorizationUrl) {
                this.authorizationUrl = authorizationUrl;
            }

            public String getTokenUrl() {
                return tokenUrl;
            }

            public void setTokenUrl(String tokenUrl) {
                this.tokenUrl = tokenUrl;
            }

            public String getStateSigningSecret() {
                return stateSigningSecret;
            }

            public void setStateSigningSecret(String stateSigningSecret) {
                this.stateSigningSecret = stateSigningSecret;
            }

            public String getTokenEncryptionKey() {
                return tokenEncryptionKey;
            }

            public void setTokenEncryptionKey(String tokenEncryptionKey) {
                this.tokenEncryptionKey = tokenEncryptionKey;
            }

            public boolean isPkceEnabled() {
                return pkceEnabled;
            }

            public void setPkceEnabled(boolean pkceEnabled) {
                this.pkceEnabled = pkceEnabled;
            }
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public long getWebhookAllowedSkewSeconds() {
        return webhookAllowedSkewSeconds;
    }

    public void setWebhookAllowedSkewSeconds(long webhookAllowedSkewSeconds) {
        this.webhookAllowedSkewSeconds = webhookAllowedSkewSeconds;
    }

    public boolean isProviderVerificationEnabled() {
        return providerVerificationEnabled;
    }

    public void setProviderVerificationEnabled(boolean providerVerificationEnabled) {
        this.providerVerificationEnabled = providerVerificationEnabled;
    }

    public String getWebhookBaseUrl() {
        return webhookBaseUrl;
    }

    public void setWebhookBaseUrl(String webhookBaseUrl) {
        this.webhookBaseUrl = webhookBaseUrl;
    }

    public Plans getPlans() {
        return plans;
    }

    public void setPlans(Plans plans) {
        this.plans = plans;
    }

    public MercadoPago getMercadopago() {
        return mercadopago;
    }

    public void setMercadopago(MercadoPago mercadopago) {
        this.mercadopago = mercadopago;
    }
}

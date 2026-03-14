package com.plura.plurabackend.core.billing;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.util.Locale;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Propiedades de configuración del módulo de facturación.
 * Se cargan desde el prefijo "billing" en application.properties/yml.
 * Contiene la configuración de planes, proveedores de pago (MercadoPago y dLocal),
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
    private DLocal dlocal = new DLocal();

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

        if (!mercadopago.enabled && !dlocal.enabled) {
            throw new IllegalStateException("BILLING_ENABLED=true requiere al menos un proveedor activo");
        }

        if (mercadopago.enabled) {
            requirePresent(mercadopago.accessToken, "BILLING_MERCADOPAGO_ACCESS_TOKEN");
            requirePresent(mercadopago.webhookSecret, "BILLING_MERCADOPAGO_WEBHOOK_SECRET");
        }

        if (dlocal.enabled) {
            requirePresent(dlocal.xLogin, "BILLING_DLOCAL_X_LOGIN");
            requirePresent(dlocal.secretKey, "BILLING_DLOCAL_SECRET_KEY");
            requirePresent(dlocal.webhookSecret, "BILLING_DLOCAL_WEBHOOK_SECRET");
        }
    }

    /**
     * Verifica si un proveedor de pagos específico está habilitado.
     *
     * @param provider el proveedor a verificar (MERCADOPAGO o DLOCAL)
     * @return true si el proveedor está habilitado
     */
    public boolean isProviderEnabled(PaymentProvider provider) {
        return switch (provider) {
            case MERCADOPAGO -> mercadopago.enabled;
            case DLOCAL -> dlocal.enabled;
        };
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
        private String accessToken = "";
        private String webhookSecret = "";
        private String preapprovalPlanPath = "/preapproval_plan";
        private String preapprovalPath = "/preapproval";
        private String cancelPath = "/preapproval/{id}";
        private String subscriptionStatusPath = "/preapproval/{id}";
        private boolean sandboxOnlyBodySignatureFallback = false;
        private String subscriptionBackUrl = "";
        private String successUrl = "";
        private String failureUrl = "";
        private String pendingUrl = "";
        private String planBasicId = "";
        private String planProfesionalId = "";
        private String planEnterpriseId = "";
        private int timeoutMillis = 5000;

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
    }

    /**
     * Configuración específica del proveedor dLocal.
     * Incluye credenciales, URLs de la API, rutas de endpoints,
     * configuración de firma de webhooks, país y configuración de payouts.
     */
    public static class DLocal {
        public static final String STRICT_DATE_BODY = "STRICT_DATE_BODY";

        private boolean enabled = false;
        private String baseUrl = "https://api.dlocal.com";
        private String xLogin = "";
        private String xTransKey = "";
        private String secretKey = "";
        private String webhookSecret = "";
        private String checkoutPath = "/secure_payments";
        private String bookingCheckoutPath = "/v1/payments";
        private String cancelPath = "/subscriptions/{id}/cancel";
        private String refundPath = "/v1/refunds";
        private String payoutOauthPath = "/oauth/token";
        private String payoutPath = "/payouts/v3";
        private String payoutClientId = "";
        private String payoutClientSecret = "";
        private String paymentStatusPath = "/v1/payments/{id}";
        private String subscriptionStatusPath = "/subscriptions/{id}";
        private String signatureMode = STRICT_DATE_BODY;
        private boolean sandboxOnlyBodySignatureFallback = false;
        private String country = "UY";
        private String successUrl = "";
        private String failureUrl = "";
        private int timeoutMillis = 5000;

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

        public String getXLogin() {
            return xLogin;
        }

        public void setXLogin(String xLogin) {
            this.xLogin = xLogin;
        }

        public String getXTransKey() {
            return xTransKey;
        }

        public void setXTransKey(String xTransKey) {
            this.xTransKey = xTransKey;
        }

        public String getSecretKey() {
            return secretKey;
        }

        public void setSecretKey(String secretKey) {
            this.secretKey = secretKey;
        }

        public String getWebhookSecret() {
            return webhookSecret;
        }

        public void setWebhookSecret(String webhookSecret) {
            this.webhookSecret = webhookSecret;
        }

        public String getCheckoutPath() {
            return checkoutPath;
        }

        public void setCheckoutPath(String checkoutPath) {
            this.checkoutPath = checkoutPath;
        }

        public String getBookingCheckoutPath() {
            return bookingCheckoutPath;
        }

        public void setBookingCheckoutPath(String bookingCheckoutPath) {
            this.bookingCheckoutPath = bookingCheckoutPath;
        }

        public String getCancelPath() {
            return cancelPath;
        }

        public void setCancelPath(String cancelPath) {
            this.cancelPath = cancelPath;
        }

        public String getRefundPath() {
            return refundPath;
        }

        public void setRefundPath(String refundPath) {
            this.refundPath = refundPath;
        }

        public String getPayoutOauthPath() {
            return payoutOauthPath;
        }

        public void setPayoutOauthPath(String payoutOauthPath) {
            this.payoutOauthPath = payoutOauthPath;
        }

        public String getPayoutPath() {
            return payoutPath;
        }

        public void setPayoutPath(String payoutPath) {
            this.payoutPath = payoutPath;
        }

        public String getPayoutClientId() {
            return payoutClientId;
        }

        public void setPayoutClientId(String payoutClientId) {
            this.payoutClientId = payoutClientId;
        }

        public String getPayoutClientSecret() {
            return payoutClientSecret;
        }

        public void setPayoutClientSecret(String payoutClientSecret) {
            this.payoutClientSecret = payoutClientSecret;
        }

        public String getPaymentStatusPath() {
            return paymentStatusPath;
        }

        public void setPaymentStatusPath(String paymentStatusPath) {
            this.paymentStatusPath = paymentStatusPath;
        }

        public String getSubscriptionStatusPath() {
            return subscriptionStatusPath;
        }

        public void setSubscriptionStatusPath(String subscriptionStatusPath) {
            this.subscriptionStatusPath = subscriptionStatusPath;
        }

        public String getSignatureMode() {
            return signatureMode;
        }

        public void setSignatureMode(String signatureMode) {
            this.signatureMode = signatureMode;
        }

        public boolean isSandboxOnlyBodySignatureFallback() {
            return sandboxOnlyBodySignatureFallback;
        }

        public void setSandboxOnlyBodySignatureFallback(boolean sandboxOnlyBodySignatureFallback) {
            this.sandboxOnlyBodySignatureFallback = sandboxOnlyBodySignatureFallback;
        }

        public String getCountry() {
            return country;
        }

        public void setCountry(String country) {
            this.country = country;
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

        public int getTimeoutMillis() {
            return timeoutMillis;
        }

        public void setTimeoutMillis(int timeoutMillis) {
            this.timeoutMillis = timeoutMillis;
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

    public DLocal getDlocal() {
        return dlocal;
    }

    public void setDlocal(DLocal dlocal) {
        this.dlocal = dlocal;
    }
}

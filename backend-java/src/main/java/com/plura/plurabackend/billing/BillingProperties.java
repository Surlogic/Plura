package com.plura.plurabackend.billing;

import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.billing.subscriptions.model.SubscriptionPlan;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.util.Locale;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

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

    @PostConstruct
    void validate() {
        if (!enabled) {
            return;
        }
        if (webhookAllowedSkewSeconds <= 0) {
            throw new IllegalStateException("BILLING_WEBHOOK_ALLOWED_SKEW_SECONDS debe ser > 0");
        }

        validatePlan("PLAN_BASIC", plans.planBasic);
        validatePlan("PLAN_PRO", plans.planPro);
        validatePlan("PLAN_PREMIUM", plans.planPremium);

        if (!mercadopago.enabled && !dlocal.enabled) {
            throw new IllegalStateException("BILLING_ENABLED=true requiere al menos un proveedor activo");
        }

        if (mercadopago.enabled) {
            requirePresent(mercadopago.accessToken, "BILLING_MERCADOPAGO_ACCESS_TOKEN");
            requirePresent(mercadopago.webhookSecret, "BILLING_MERCADOPAGO_WEBHOOK_SECRET");
        }

        if (dlocal.enabled) {
            requirePresent(dlocal.xLogin, "BILLING_DLOCAL_X_LOGIN");
            requirePresent(dlocal.xTransKey, "BILLING_DLOCAL_X_TRANS_KEY");
            requirePresent(dlocal.webhookSecret, "BILLING_DLOCAL_WEBHOOK_SECRET");
        }
    }

    public boolean isProviderEnabled(PaymentProvider provider) {
        return switch (provider) {
            case MERCADOPAGO -> mercadopago.enabled;
            case DLOCAL -> dlocal.enabled;
        };
    }

    public PlanConfig resolvePlan(SubscriptionPlan plan) {
        return switch (plan) {
            case PLAN_BASIC -> plans.planBasic;
            case PLAN_PRO -> plans.planPro;
            case PLAN_PREMIUM -> plans.planPremium;
        };
    }

    public boolean isProductionMode() {
        return "production".equalsIgnoreCase(mode);
    }

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

    public String resolveMercadoPagoPlanId(SubscriptionPlan plan) {
        return switch (plan) {
            case PLAN_BASIC -> mercadopago.planBasicId;
            case PLAN_PRO -> mercadopago.planProId;
            case PLAN_PREMIUM -> mercadopago.planPremiumId;
        };
    }

    private void requirePresent(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(fieldName + " no está configurado");
        }
    }

    public static class Plans {
        private PlanConfig planBasic = new PlanConfig();
        private PlanConfig planPro = new PlanConfig();
        private PlanConfig planPremium = new PlanConfig();

        public PlanConfig getPlanBasic() {
            return planBasic;
        }

        public void setPlanBasic(PlanConfig planBasic) {
            this.planBasic = planBasic;
        }

        public PlanConfig getPlanPro() {
            return planPro;
        }

        public void setPlanPro(PlanConfig planPro) {
            this.planPro = planPro;
        }

        public PlanConfig getPlanPremium() {
            return planPremium;
        }

        public void setPlanPremium(PlanConfig planPremium) {
            this.planPremium = planPremium;
        }
    }

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
        private String planProId = "";
        private String planPremiumId = "";
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

        public String getPlanProId() {
            return planProId;
        }

        public void setPlanProId(String planProId) {
            this.planProId = planProId;
        }

        public String getPlanPremiumId() {
            return planPremiumId;
        }

        public void setPlanPremiumId(String planPremiumId) {
            this.planPremiumId = planPremiumId;
        }

        public int getTimeoutMillis() {
            return timeoutMillis;
        }

        public void setTimeoutMillis(int timeoutMillis) {
            this.timeoutMillis = timeoutMillis;
        }
    }

    public static class DLocal {
        public static final String STRICT_DATE_BODY = "STRICT_DATE_BODY";

        private boolean enabled = false;
        private String baseUrl = "https://api.dlocal.com";
        private String xLogin = "";
        private String xTransKey = "";
        private String webhookSecret = "";
        private String checkoutPath = "/secure_payments";
        private String cancelPath = "/subscriptions/{id}/cancel";
        private String paymentStatusPath = "/payments/{id}";
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

        public String getCancelPath() {
            return cancelPath;
        }

        public void setCancelPath(String cancelPath) {
            this.cancelPath = cancelPath;
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

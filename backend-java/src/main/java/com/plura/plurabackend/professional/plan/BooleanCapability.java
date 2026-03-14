package com.plura.plurabackend.professional.plan;

import java.util.function.Predicate;

public enum BooleanCapability {
    ONLINE_PAYMENTS(
        "pagos online",
        ProfessionalPlanEntitlements::allowOnlinePayments
    ),
    CLIENT_PROFILE(
        "ficha del cliente",
        ProfessionalPlanEntitlements::allowClientProfile
    ),
    INTERNAL_CLIENT_NOTES(
        "notas internas por cliente",
        ProfessionalPlanEntitlements::allowInternalClientNotes
    ),
    VISIT_HISTORY(
        "historial de visitas",
        ProfessionalPlanEntitlements::allowVisitHistory
    ),
    POST_SERVICE_FOLLOWUP(
        "seguimiento post-servicio",
        ProfessionalPlanEntitlements::allowPostServiceFollowup
    ),
    AUTOMATIONS(
        "automatizaciones",
        ProfessionalPlanEntitlements::allowAutomations
    ),
    INTERNAL_CHAT(
        "chat interno",
        ProfessionalPlanEntitlements::allowInternalChat
    ),
    LOYALTY(
        "programa de puntos",
        ProfessionalPlanEntitlements::allowLoyalty
    ),
    LAST_MINUTE_PROMOTIONS(
        "promociones de última hora",
        ProfessionalPlanEntitlements::allowLastMinutePromotions
    ),
    PACKAGES(
        "paquetes",
        ProfessionalPlanEntitlements::allowPackages
    ),
    GIFT_CARDS(
        "gift cards",
        ProfessionalPlanEntitlements::allowGiftCards
    ),
    STORE(
        "tienda",
        ProfessionalPlanEntitlements::allowStore
    ),
    SHIPPING(
        "envíos",
        ProfessionalPlanEntitlements::allowShipping
    ),
    FEATURED_REVIEWS(
        "reseñas destacadas",
        ProfessionalPlanEntitlements::allowFeaturedReviews
    ),
    VERIFIED_BADGE(
        "badge verificado",
        ProfessionalPlanEntitlements::allowVerifiedBadge
    ),
    PORTFOLIO(
        "portfolio",
        ProfessionalPlanEntitlements::allowPortfolio
    );

    private final String label;
    private final Predicate<ProfessionalPlanEntitlements> predicate;

    BooleanCapability(String label, Predicate<ProfessionalPlanEntitlements> predicate) {
        this.label = label;
        this.predicate = predicate;
    }

    public boolean isEnabled(ProfessionalPlanEntitlements entitlements) {
        return entitlements != null && predicate.test(entitlements);
    }

    public String deniedMessage() {
        return "Tu plan no permite " + label;
    }
}

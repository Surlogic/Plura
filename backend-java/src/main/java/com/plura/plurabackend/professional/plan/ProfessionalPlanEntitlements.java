package com.plura.plurabackend.professional.plan;

/**
 * ProfessionalPlanEntitlements es un modelo inmutable del modulo profesionales / planes.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, planes.
 */
public record ProfessionalPlanEntitlements(
    int maxProfessionals,
    int maxLocations,
    int maxBusinessPhotos,
    int maxServiceImagesPerService,
    int maxServices,
    PublicProfileTier publicProfileTier,
    ScheduleTier scheduleTier,
    AnalyticsTier analyticsTier,
    boolean allowOnlinePayments,
    boolean allowClientProfile,
    boolean allowInternalClientNotes,
    boolean allowVisitHistory,
    boolean allowPostServiceFollowup,
    boolean allowAutomations,
    boolean allowInternalChat,
    boolean allowLoyalty,
    boolean allowLastMinutePromotions,
    boolean allowPackages,
    boolean allowGiftCards,
    boolean allowStore,
    boolean allowShipping,
    boolean allowFeaturedReviews,
    boolean allowVerifiedBadge,
    boolean allowPortfolio
) {}

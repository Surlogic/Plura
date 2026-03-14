package com.plura.plurabackend.professional.plan;

public record ProfessionalPlanEntitlements(
    int maxProfessionals,
    int maxLocations,
    int maxBusinessPhotos,
    int maxServiceImagesPerService,
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

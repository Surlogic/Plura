"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProfessionalCoreFeature = exports.canAccessProfessionalFeature = exports.resolveProfessionalFeatureAccess = exports.professionalCoreFeatureAccess = void 0;
const CORE_FEATURE_ACCESS = {
    enhancedPublicProfile: true,
    onlinePayments: true,
    weeklyCalendarNavigation: true,
    monthlyCalendar: true,
    basicAnalytics: false,
    advancedAnalytics: false,
};
exports.professionalCoreFeatureAccess = CORE_FEATURE_ACCESS;
const resolveProfessionalFeatureAccess = (profile) => {
    const entitlements = profile?.professionalEntitlements;
    return {
        enhancedPublicProfile: entitlements
            ? entitlements.publicProfileTier === 'ENHANCED'
            : CORE_FEATURE_ACCESS.enhancedPublicProfile,
        onlinePayments: entitlements
            ? entitlements.allowOnlinePayments
            : CORE_FEATURE_ACCESS.onlinePayments,
        weeklyCalendarNavigation: CORE_FEATURE_ACCESS.weeklyCalendarNavigation,
        monthlyCalendar: CORE_FEATURE_ACCESS.monthlyCalendar,
        basicAnalytics: entitlements
            ? entitlements.analyticsTier !== 'NONE'
            : CORE_FEATURE_ACCESS.basicAnalytics,
        advancedAnalytics: entitlements
            ? entitlements.analyticsTier === 'ADVANCED'
            : CORE_FEATURE_ACCESS.advancedAnalytics,
    };
};
exports.resolveProfessionalFeatureAccess = resolveProfessionalFeatureAccess;
const canAccessProfessionalFeature = (profile, feature) => (0, exports.resolveProfessionalFeatureAccess)(profile)[feature];
exports.canAccessProfessionalFeature = canAccessProfessionalFeature;
const isProfessionalCoreFeature = (feature) => CORE_FEATURE_ACCESS[feature];
exports.isProfessionalCoreFeature = isProfessionalCoreFeature;

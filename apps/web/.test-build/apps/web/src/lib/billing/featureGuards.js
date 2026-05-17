"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProfessionalCoreFeature = exports.canAccessProfessionalFeature = exports.resolveProfessionalFeatureAccess = exports.professionalCoreFeatureAccess = void 0;
const billingPlans_1 = require("../../config/billingPlans");
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
    const profilePlan = (0, billingPlans_1.resolveBillingPlanFromProfilePlanCode)(profile?.professionalPlan);
    const canUseCoreDefaults = !profile || !profile.professionalPlan || profilePlan === 'CORE';
    return {
        enhancedPublicProfile: entitlements
            ? entitlements.publicProfileTier === 'ENHANCED'
            : canUseCoreDefaults && CORE_FEATURE_ACCESS.enhancedPublicProfile,
        onlinePayments: entitlements
            ? entitlements.allowOnlinePayments
            : canUseCoreDefaults && CORE_FEATURE_ACCESS.onlinePayments,
        weeklyCalendarNavigation: entitlements
            ? entitlements.scheduleTier === 'WEEKLY' || entitlements.scheduleTier === 'MASTER'
            : canUseCoreDefaults && CORE_FEATURE_ACCESS.weeklyCalendarNavigation,
        monthlyCalendar: entitlements
            ? entitlements.scheduleTier === 'MASTER'
            : canUseCoreDefaults && CORE_FEATURE_ACCESS.monthlyCalendar,
        basicAnalytics: entitlements
            ? entitlements.analyticsTier !== 'NONE'
            : canUseCoreDefaults && CORE_FEATURE_ACCESS.basicAnalytics,
        advancedAnalytics: entitlements
            ? entitlements.analyticsTier === 'ADVANCED'
            : canUseCoreDefaults && CORE_FEATURE_ACCESS.advancedAnalytics,
    };
};
exports.resolveProfessionalFeatureAccess = resolveProfessionalFeatureAccess;
const canAccessProfessionalFeature = (profile, feature) => (0, exports.resolveProfessionalFeatureAccess)(profile)[feature];
exports.canAccessProfessionalFeature = canAccessProfessionalFeature;
const isProfessionalCoreFeature = (feature) => CORE_FEATURE_ACCESS[feature];
exports.isProfessionalCoreFeature = isProfessionalCoreFeature;

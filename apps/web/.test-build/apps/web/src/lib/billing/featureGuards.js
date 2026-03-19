"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiredPlanForFeature = exports.planIncludesProfessionalFeature = exports.canAccessProfessionalFeature = exports.resolveProfessionalFeatureAccess = exports.professionalFeatureRequiredPlan = void 0;
const planAccess_1 = require("../../../../../packages/shared/src/billing/planAccess");
const FEATURE_REQUIRED_PLAN = {
    enhancedPublicProfile: 'PROFESIONAL',
    onlinePayments: 'PROFESIONAL',
    weeklyCalendarNavigation: 'PROFESIONAL',
    monthlyCalendar: 'ENTERPRISE',
    basicAnalytics: 'PROFESIONAL',
    advancedAnalytics: 'ENTERPRISE',
};
exports.professionalFeatureRequiredPlan = FEATURE_REQUIRED_PLAN;
const resolveProfessionalFeatureAccess = (profile) => {
    const currentPlan = profile?.professionalPlan ?? 'BASIC';
    const entitlements = profile?.professionalEntitlements;
    return {
        enhancedPublicProfile: entitlements
            ? entitlements.publicProfileTier === 'ENHANCED'
            : (0, planAccess_1.hasPlanAccess)(currentPlan, 'PROFESIONAL'),
        onlinePayments: entitlements
            ? entitlements.allowOnlinePayments
            : (0, planAccess_1.hasPlanAccess)(currentPlan, 'PROFESIONAL'),
        weeklyCalendarNavigation: entitlements
            ? entitlements.scheduleTier !== 'DAILY'
            : (0, planAccess_1.hasPlanAccess)(currentPlan, 'PROFESIONAL'),
        monthlyCalendar: entitlements
            ? entitlements.scheduleTier === 'MASTER'
            : (0, planAccess_1.hasPlanAccess)(currentPlan, 'ENTERPRISE'),
        basicAnalytics: entitlements
            ? entitlements.analyticsTier !== 'NONE'
            : (0, planAccess_1.hasPlanAccess)(currentPlan, 'PROFESIONAL'),
        advancedAnalytics: entitlements
            ? entitlements.analyticsTier === 'ADVANCED'
            : (0, planAccess_1.hasPlanAccess)(currentPlan, 'ENTERPRISE'),
    };
};
exports.resolveProfessionalFeatureAccess = resolveProfessionalFeatureAccess;
const canAccessProfessionalFeature = (profile, feature) => (0, exports.resolveProfessionalFeatureAccess)(profile)[feature];
exports.canAccessProfessionalFeature = canAccessProfessionalFeature;
const planIncludesProfessionalFeature = (planId, feature) => (0, planAccess_1.hasPlanAccess)(planId, FEATURE_REQUIRED_PLAN[feature]);
exports.planIncludesProfessionalFeature = planIncludesProfessionalFeature;
const requiredPlanForFeature = (feature) => FEATURE_REQUIRED_PLAN[feature];
exports.requiredPlanForFeature = requiredPlanForFeature;

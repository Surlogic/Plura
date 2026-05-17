"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const featureGuards_1 = require("./featureGuards");
const buildEntitlements = (overrides = {}) => ({
    maxProfessionals: 1,
    maxLocations: 1,
    maxBusinessPhotos: 6,
    maxServiceImagesPerService: 1,
    maxServices: 30,
    publicProfileTier: 'ENHANCED',
    scheduleTier: 'MASTER',
    analyticsTier: 'NONE',
    allowOnlinePayments: true,
    allowClientProfile: false,
    allowInternalClientNotes: false,
    allowVisitHistory: false,
    allowPostServiceFollowup: false,
    allowAutomations: false,
    allowInternalChat: false,
    allowLoyalty: false,
    allowLastMinutePromotions: false,
    allowPackages: false,
    allowGiftCards: false,
    allowStore: false,
    allowShipping: false,
    allowFeaturedReviews: false,
    allowVerifiedBadge: false,
    allowPortfolio: false,
    ...overrides,
});
const buildProfile = (overrides = {}) => ({
    id: 'professional-1',
    fullName: 'Profesional Demo',
    email: 'demo@plura.test',
    emailVerified: true,
    phoneNumber: '+59800000000',
    phoneVerified: true,
    rubro: 'Belleza',
    location: 'Montevideo',
    tipoCliente: 'PROFESSIONAL',
    professionalPlan: 'CORE',
    ...overrides,
});
(0, node_test_1.default)('resolveProfessionalFeatureAccess falls back to Core defaults', () => {
    const access = (0, featureGuards_1.resolveProfessionalFeatureAccess)(buildProfile());
    strict_1.default.deepEqual(access, {
        enhancedPublicProfile: true,
        onlinePayments: true,
        weeklyCalendarNavigation: true,
        monthlyCalendar: true,
        basicAnalytics: false,
        advancedAnalytics: false,
    });
});
(0, node_test_1.default)('resolveProfessionalFeatureAccess treats legacy plan strings as Core defaults', () => {
    const access = (0, featureGuards_1.resolveProfessionalFeatureAccess)(buildProfile({
        professionalPlan: 'ENTERPRISE',
    }));
    strict_1.default.deepEqual(access, {
        enhancedPublicProfile: true,
        onlinePayments: true,
        weeklyCalendarNavigation: true,
        monthlyCalendar: true,
        basicAnalytics: false,
        advancedAnalytics: false,
    });
});
(0, node_test_1.default)('resolveProfessionalFeatureAccess prefers entitlements over profile plan code when present', () => {
    const access = (0, featureGuards_1.resolveProfessionalFeatureAccess)(buildProfile({
        professionalPlan: 'ENTERPRISE',
        professionalEntitlements: buildEntitlements({
            publicProfileTier: 'BASIC',
            scheduleTier: 'WEEKLY',
            analyticsTier: 'BASIC',
            allowOnlinePayments: false,
        }),
    }));
    strict_1.default.equal(access.enhancedPublicProfile, false);
    strict_1.default.equal(access.onlinePayments, false);
    strict_1.default.equal(access.weeklyCalendarNavigation, true);
    strict_1.default.equal(access.monthlyCalendar, true);
    strict_1.default.equal(access.basicAnalytics, true);
    strict_1.default.equal(access.advancedAnalytics, false);
});
(0, node_test_1.default)('isProfessionalCoreFeature only marks Core MVP features as included', () => {
    strict_1.default.equal((0, featureGuards_1.isProfessionalCoreFeature)('onlinePayments'), true);
    strict_1.default.equal((0, featureGuards_1.isProfessionalCoreFeature)('weeklyCalendarNavigation'), true);
    strict_1.default.equal((0, featureGuards_1.isProfessionalCoreFeature)('monthlyCalendar'), true);
    strict_1.default.equal((0, featureGuards_1.isProfessionalCoreFeature)('basicAnalytics'), false);
    strict_1.default.equal((0, featureGuards_1.isProfessionalCoreFeature)('advancedAnalytics'), false);
});

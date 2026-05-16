import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  ProfessionalPlanCode,
  ProfessionalPlanEntitlements,
  ProfessionalProfile,
} from '@/types/professional';
import {
  planIncludesProfessionalFeature,
  requiredPlanForFeature,
  resolveProfessionalFeatureAccess,
} from './featureGuards';

const buildEntitlements = (
  overrides: Partial<ProfessionalPlanEntitlements> = {},
): ProfessionalPlanEntitlements => ({
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

const buildProfile = (
  overrides: Partial<ProfessionalProfile> & {
    professionalPlan?: ProfessionalPlanCode | string;
  } = {},
): ProfessionalProfile => ({
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

test('resolveProfessionalFeatureAccess falls back to CORE defaults', () => {
  const access = resolveProfessionalFeatureAccess(buildProfile());

  assert.deepEqual(access, {
    enhancedPublicProfile: true,
    onlinePayments: true,
    weeklyCalendarNavigation: true,
    monthlyCalendar: true,
    basicAnalytics: false,
    advancedAnalytics: false,
  });
});

test('resolveProfessionalFeatureAccess treats LOCAL legacy as Core defaults', () => {
  const access = resolveProfessionalFeatureAccess(buildProfile({
    professionalPlan: 'LOCAL' as unknown as ProfessionalPlanCode,
  }));

  assert.deepEqual(access, {
    enhancedPublicProfile: true,
    onlinePayments: true,
    weeklyCalendarNavigation: true,
    monthlyCalendar: true,
    basicAnalytics: false,
    advancedAnalytics: false,
  });
});

test('resolveProfessionalFeatureAccess treats ENTERPRISE legacy as Core defaults', () => {
  const access = resolveProfessionalFeatureAccess(buildProfile({
    professionalPlan: 'ENTERPRISE' as unknown as ProfessionalPlanCode,
  }));

  assert.deepEqual(access, {
    enhancedPublicProfile: true,
    onlinePayments: true,
    weeklyCalendarNavigation: true,
    monthlyCalendar: true,
    basicAnalytics: false,
    advancedAnalytics: false,
  });
});

test('resolveProfessionalFeatureAccess prefers entitlements over plan code when present', () => {
  const access = resolveProfessionalFeatureAccess(buildProfile({
    professionalPlan: 'ENTERPRISE' as unknown as ProfessionalPlanCode,
    professionalEntitlements: buildEntitlements({
      publicProfileTier: 'BASIC',
      scheduleTier: 'WEEKLY',
      analyticsTier: 'BASIC',
      allowOnlinePayments: false,
    }),
  }));

  assert.equal(access.enhancedPublicProfile, false);
  assert.equal(access.onlinePayments, false);
  assert.equal(access.weeklyCalendarNavigation, true);
  assert.equal(access.monthlyCalendar, true);
  assert.equal(access.basicAnalytics, true);
  assert.equal(access.advancedAnalytics, false);
});

test('planIncludesProfessionalFeature matches the expected paywall boundaries', () => {
  assert.equal(planIncludesProfessionalFeature('CORE', 'onlinePayments'), true);
  assert.equal(planIncludesProfessionalFeature('CORE', 'weeklyCalendarNavigation'), true);
  assert.equal(planIncludesProfessionalFeature('CORE', 'monthlyCalendar'), true);
  assert.equal(planIncludesProfessionalFeature('CORE', 'advancedAnalytics'), false);
});

test('requiredPlanForFeature exposes the correct minimum plan', () => {
  assert.equal(requiredPlanForFeature('enhancedPublicProfile'), 'CORE');
  assert.equal(requiredPlanForFeature('advancedAnalytics'), 'CORE');
});

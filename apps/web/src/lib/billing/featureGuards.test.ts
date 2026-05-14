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
  maxBusinessPhotos: 3,
  maxServiceImagesPerService: 1,
  maxServices: 15,
  publicProfileTier: 'ENHANCED',
  scheduleTier: 'DAILY',
  analyticsTier: 'NONE',
  allowOnlinePayments: false,
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
    professionalPlan?: ProfessionalPlanCode;
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
  professionalPlan: 'PROFESSIONAL',
  ...overrides,
});

test('resolveProfessionalFeatureAccess falls back to PROFESSIONAL plan defaults', () => {
  const access = resolveProfessionalFeatureAccess(buildProfile());

  assert.deepEqual(access, {
    enhancedPublicProfile: true,
    onlinePayments: false,
    weeklyCalendarNavigation: true,
    monthlyCalendar: true,
    basicAnalytics: false,
    advancedAnalytics: false,
  });
});

test('resolveProfessionalFeatureAccess falls back to LOCAL plan defaults', () => {
  const access = resolveProfessionalFeatureAccess(buildProfile({
    professionalPlan: 'LOCAL',
  }));

  assert.deepEqual(access, {
    enhancedPublicProfile: true,
    onlinePayments: true,
    weeklyCalendarNavigation: true,
    monthlyCalendar: true,
    basicAnalytics: true,
    advancedAnalytics: false,
  });
});

test('resolveProfessionalFeatureAccess falls back to ENTERPRISE plan defaults', () => {
  const access = resolveProfessionalFeatureAccess(buildProfile({
    professionalPlan: 'ENTERPRISE',
  }));

  assert.deepEqual(access, {
    enhancedPublicProfile: true,
    onlinePayments: true,
    weeklyCalendarNavigation: true,
    monthlyCalendar: true,
    basicAnalytics: true,
    advancedAnalytics: true,
  });
});

test('resolveProfessionalFeatureAccess prefers entitlements over plan code when present', () => {
  const access = resolveProfessionalFeatureAccess(buildProfile({
    professionalPlan: 'ENTERPRISE',
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
  assert.equal(planIncludesProfessionalFeature('PROFESSIONAL', 'onlinePayments'), false);
  assert.equal(planIncludesProfessionalFeature('LOCAL', 'onlinePayments'), true);
  assert.equal(planIncludesProfessionalFeature('PROFESSIONAL', 'weeklyCalendarNavigation'), true);
  assert.equal(planIncludesProfessionalFeature('PROFESSIONAL', 'monthlyCalendar'), true);
  assert.equal(planIncludesProfessionalFeature('LOCAL', 'monthlyCalendar'), true);
  assert.equal(planIncludesProfessionalFeature('ENTERPRISE', 'monthlyCalendar'), true);
});

test('requiredPlanForFeature exposes the correct minimum plan', () => {
  assert.equal(requiredPlanForFeature('enhancedPublicProfile'), 'PROFESSIONAL');
  assert.equal(requiredPlanForFeature('advancedAnalytics'), 'ENTERPRISE');
});

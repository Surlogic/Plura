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
  maxBusinessPhotos: 5,
  maxServiceImagesPerService: 1,
  publicProfileTier: 'BASIC',
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
  professionalPlan: 'BASIC',
  ...overrides,
});

test('resolveProfessionalFeatureAccess falls back to BASIC plan defaults', () => {
  const access = resolveProfessionalFeatureAccess(buildProfile());

  assert.deepEqual(access, {
    enhancedPublicProfile: false,
    onlinePayments: false,
    weeklyCalendarNavigation: false,
    monthlyCalendar: false,
    basicAnalytics: false,
    advancedAnalytics: false,
  });
});

test('resolveProfessionalFeatureAccess falls back to PROFESSIONAL plan defaults', () => {
  const access = resolveProfessionalFeatureAccess(buildProfile({
    professionalPlan: 'PROFESIONAL',
  }));

  assert.deepEqual(access, {
    enhancedPublicProfile: true,
    onlinePayments: true,
    weeklyCalendarNavigation: true,
    monthlyCalendar: false,
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
  assert.equal(access.monthlyCalendar, false);
  assert.equal(access.basicAnalytics, true);
  assert.equal(access.advancedAnalytics, false);
});

test('planIncludesProfessionalFeature matches the expected paywall boundaries', () => {
  assert.equal(planIncludesProfessionalFeature('BASIC', 'onlinePayments'), false);
  assert.equal(planIncludesProfessionalFeature('PROFESIONAL', 'onlinePayments'), true);
  assert.equal(planIncludesProfessionalFeature('PROFESIONAL', 'monthlyCalendar'), false);
  assert.equal(planIncludesProfessionalFeature('ENTERPRISE', 'monthlyCalendar'), true);
});

test('requiredPlanForFeature exposes the correct minimum plan', () => {
  assert.equal(requiredPlanForFeature('enhancedPublicProfile'), 'PROFESIONAL');
  assert.equal(requiredPlanForFeature('advancedAnalytics'), 'ENTERPRISE');
});

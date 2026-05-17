import type { ProfessionalProfile } from '@/types/professional';
import { resolveBillingPlanFromProfilePlanCode } from '../../config/billingPlans';

export type ProfessionalFeatureKey =
  | 'enhancedPublicProfile'
  | 'onlinePayments'
  | 'weeklyCalendarNavigation'
  | 'monthlyCalendar'
  | 'basicAnalytics'
  | 'advancedAnalytics';

const CORE_FEATURE_ACCESS: Record<ProfessionalFeatureKey, boolean> = {
  enhancedPublicProfile: true,
  onlinePayments: true,
  weeklyCalendarNavigation: true,
  monthlyCalendar: true,
  basicAnalytics: false,
  advancedAnalytics: false,
};

export const professionalCoreFeatureAccess = CORE_FEATURE_ACCESS;

export const resolveProfessionalFeatureAccess = (profile?: ProfessionalProfile | null) => {
  const entitlements = profile?.professionalEntitlements;
  const profilePlan = resolveBillingPlanFromProfilePlanCode(profile?.professionalPlan);
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

export const canAccessProfessionalFeature = (
  profile: ProfessionalProfile | null | undefined,
  feature: ProfessionalFeatureKey,
) => resolveProfessionalFeatureAccess(profile)[feature];

export const isProfessionalCoreFeature = (feature: ProfessionalFeatureKey): boolean =>
  CORE_FEATURE_ACCESS[feature];

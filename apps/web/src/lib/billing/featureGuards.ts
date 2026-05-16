import type { ProfessionalProfile } from '@/types/professional';

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

export const canAccessProfessionalFeature = (
  profile: ProfessionalProfile | null | undefined,
  feature: ProfessionalFeatureKey,
) => resolveProfessionalFeatureAccess(profile)[feature];

export const isProfessionalCoreFeature = (feature: ProfessionalFeatureKey): boolean =>
  CORE_FEATURE_ACCESS[feature];

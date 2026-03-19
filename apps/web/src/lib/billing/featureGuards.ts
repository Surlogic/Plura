import type { BillingUiPlanId } from '@/config/billingPlans';
import type { ProfessionalProfile } from '@/types/professional';
import type { ProfessionalPlanCode } from '../../../../../packages/shared/src/types/professional';
import { hasPlanAccess } from '../../../../../packages/shared/src/billing/planAccess';

export type ProfessionalFeatureKey =
  | 'enhancedPublicProfile'
  | 'onlinePayments'
  | 'weeklyCalendarNavigation'
  | 'monthlyCalendar'
  | 'basicAnalytics'
  | 'advancedAnalytics';

const FEATURE_REQUIRED_PLAN: Record<ProfessionalFeatureKey, ProfessionalPlanCode> = {
  enhancedPublicProfile: 'PROFESIONAL',
  onlinePayments: 'PROFESIONAL',
  weeklyCalendarNavigation: 'PROFESIONAL',
  monthlyCalendar: 'ENTERPRISE',
  basicAnalytics: 'PROFESIONAL',
  advancedAnalytics: 'ENTERPRISE',
};

export const professionalFeatureRequiredPlan = FEATURE_REQUIRED_PLAN;

export const resolveProfessionalFeatureAccess = (profile?: ProfessionalProfile | null) => {
  const currentPlan = profile?.professionalPlan ?? 'BASIC';
  const entitlements = profile?.professionalEntitlements;

  return {
    enhancedPublicProfile: entitlements
      ? entitlements.publicProfileTier === 'ENHANCED'
      : hasPlanAccess(currentPlan, 'PROFESIONAL'),
    onlinePayments: entitlements
      ? entitlements.allowOnlinePayments
      : hasPlanAccess(currentPlan, 'PROFESIONAL'),
    weeklyCalendarNavigation: entitlements
      ? entitlements.scheduleTier !== 'DAILY'
      : hasPlanAccess(currentPlan, 'PROFESIONAL'),
    monthlyCalendar: entitlements
      ? entitlements.scheduleTier === 'MASTER'
      : hasPlanAccess(currentPlan, 'ENTERPRISE'),
    basicAnalytics: entitlements
      ? entitlements.analyticsTier !== 'NONE'
      : hasPlanAccess(currentPlan, 'PROFESIONAL'),
    advancedAnalytics: entitlements
      ? entitlements.analyticsTier === 'ADVANCED'
      : hasPlanAccess(currentPlan, 'ENTERPRISE'),
  };
};

export const canAccessProfessionalFeature = (
  profile: ProfessionalProfile | null | undefined,
  feature: ProfessionalFeatureKey,
) => resolveProfessionalFeatureAccess(profile)[feature];

export const planIncludesProfessionalFeature = (
  planId: BillingUiPlanId,
  feature: ProfessionalFeatureKey,
) => hasPlanAccess(planId, FEATURE_REQUIRED_PLAN[feature]);

export const requiredPlanForFeature = (
  feature: ProfessionalFeatureKey,
): ProfessionalPlanCode => FEATURE_REQUIRED_PLAN[feature];

export type ProfessionalPlanCode = 'BASIC' | 'PROFESIONAL' | 'ENTERPRISE';

export type ProfessionalMediaPresentation = {
  positionX: number;
  positionY: number;
  zoom: number;
};

export type PublicProfileTier = 'BASIC' | 'ENHANCED';
export type ScheduleTier = 'DAILY' | 'WEEKLY' | 'MASTER';
export type AnalyticsTier = 'NONE' | 'BASIC' | 'ADVANCED';

export type ProfessionalPlanEntitlements = {
  maxProfessionals: number;
  maxLocations: number;
  maxBusinessPhotos: number;
  maxServiceImagesPerService: number;
  maxServices: number;
  publicProfileTier: PublicProfileTier;
  scheduleTier: ScheduleTier;
  analyticsTier: AnalyticsTier;
  allowOnlinePayments: boolean;
  allowClientProfile: boolean;
  allowInternalClientNotes: boolean;
  allowVisitHistory: boolean;
  allowPostServiceFollowup: boolean;
  allowAutomations: boolean;
  allowInternalChat: boolean;
  allowLoyalty: boolean;
  allowLastMinutePromotions: boolean;
  allowPackages: boolean;
  allowGiftCards: boolean;
  allowStore: boolean;
  allowShipping: boolean;
  allowFeaturedReviews: boolean;
  allowVerifiedBadge: boolean;
  allowPortfolio: boolean;
};

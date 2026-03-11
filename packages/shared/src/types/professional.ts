export type ProductPlanCode = 'BASIC' | 'PROFESSIONAL' | 'COMPANY';

export type ProductPlanCapabilities = {
  maxProfessionals: number;
  maxBusinessPhotos: number;
  maxServicePhotos: number;
  allowClientChooseProfessional: boolean;
  allowOnlinePayments: boolean;
  allowAnalytics: boolean;
  allowAdvancedClientProfile: boolean;
  allowAutomations: boolean;
  allowLoyalty: boolean;
  allowLastMinute: boolean;
  allowStore: boolean;
  allowChat: boolean;
  allowWhatsappAutomatic: boolean;
  allowInAppNotifications: boolean;
  allowNewBookingNotifications: boolean;
  allowClientReminders: boolean;
};

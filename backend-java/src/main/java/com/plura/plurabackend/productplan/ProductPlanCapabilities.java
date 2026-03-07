package com.plura.plurabackend.productplan;

public record ProductPlanCapabilities(
    int maxProfessionals,
    int maxBusinessPhotos,
    int maxServicePhotos,
    boolean allowClientChooseProfessional,
    boolean allowOnlinePayments,
    boolean allowAnalytics,
    boolean allowAdvancedClientProfile,
    boolean allowAutomations,
    boolean allowLoyalty,
    boolean allowLastMinute,
    boolean allowStore,
    boolean allowChat,
    boolean allowWhatsappAutomatic,
    boolean allowInAppNotifications,
    boolean allowNewBookingNotifications,
    boolean allowClientReminders
) {

    public ProductPlanCapabilities withMaxProfessionals(int value) {
        return new ProductPlanCapabilities(
            value,
            maxBusinessPhotos,
            maxServicePhotos,
            allowClientChooseProfessional,
            allowOnlinePayments,
            allowAnalytics,
            allowAdvancedClientProfile,
            allowAutomations,
            allowLoyalty,
            allowLastMinute,
            allowStore,
            allowChat,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withMaxBusinessPhotos(int value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            value,
            maxServicePhotos,
            allowClientChooseProfessional,
            allowOnlinePayments,
            allowAnalytics,
            allowAdvancedClientProfile,
            allowAutomations,
            allowLoyalty,
            allowLastMinute,
            allowStore,
            allowChat,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withMaxServicePhotos(int value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            value,
            allowClientChooseProfessional,
            allowOnlinePayments,
            allowAnalytics,
            allowAdvancedClientProfile,
            allowAutomations,
            allowLoyalty,
            allowLastMinute,
            allowStore,
            allowChat,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withAllowClientChooseProfessional(boolean value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            maxServicePhotos,
            value,
            allowOnlinePayments,
            allowAnalytics,
            allowAdvancedClientProfile,
            allowAutomations,
            allowLoyalty,
            allowLastMinute,
            allowStore,
            allowChat,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withAllowOnlinePayments(boolean value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            maxServicePhotos,
            allowClientChooseProfessional,
            value,
            allowAnalytics,
            allowAdvancedClientProfile,
            allowAutomations,
            allowLoyalty,
            allowLastMinute,
            allowStore,
            allowChat,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withAllowAnalytics(boolean value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            maxServicePhotos,
            allowClientChooseProfessional,
            allowOnlinePayments,
            value,
            allowAdvancedClientProfile,
            allowAutomations,
            allowLoyalty,
            allowLastMinute,
            allowStore,
            allowChat,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withAllowAdvancedClientProfile(boolean value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            maxServicePhotos,
            allowClientChooseProfessional,
            allowOnlinePayments,
            allowAnalytics,
            value,
            allowAutomations,
            allowLoyalty,
            allowLastMinute,
            allowStore,
            allowChat,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withAllowAutomations(boolean value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            maxServicePhotos,
            allowClientChooseProfessional,
            allowOnlinePayments,
            allowAnalytics,
            allowAdvancedClientProfile,
            value,
            allowLoyalty,
            allowLastMinute,
            allowStore,
            allowChat,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withAllowLoyalty(boolean value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            maxServicePhotos,
            allowClientChooseProfessional,
            allowOnlinePayments,
            allowAnalytics,
            allowAdvancedClientProfile,
            allowAutomations,
            value,
            allowLastMinute,
            allowStore,
            allowChat,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withAllowLastMinute(boolean value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            maxServicePhotos,
            allowClientChooseProfessional,
            allowOnlinePayments,
            allowAnalytics,
            allowAdvancedClientProfile,
            allowAutomations,
            allowLoyalty,
            value,
            allowStore,
            allowChat,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withAllowStore(boolean value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            maxServicePhotos,
            allowClientChooseProfessional,
            allowOnlinePayments,
            allowAnalytics,
            allowAdvancedClientProfile,
            allowAutomations,
            allowLoyalty,
            allowLastMinute,
            value,
            allowChat,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withAllowChat(boolean value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            maxServicePhotos,
            allowClientChooseProfessional,
            allowOnlinePayments,
            allowAnalytics,
            allowAdvancedClientProfile,
            allowAutomations,
            allowLoyalty,
            allowLastMinute,
            allowStore,
            value,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withAllowWhatsappAutomatic(boolean value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            maxServicePhotos,
            allowClientChooseProfessional,
            allowOnlinePayments,
            allowAnalytics,
            allowAdvancedClientProfile,
            allowAutomations,
            allowLoyalty,
            allowLastMinute,
            allowStore,
            allowChat,
            value,
            allowInAppNotifications,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withAllowInAppNotifications(boolean value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            maxServicePhotos,
            allowClientChooseProfessional,
            allowOnlinePayments,
            allowAnalytics,
            allowAdvancedClientProfile,
            allowAutomations,
            allowLoyalty,
            allowLastMinute,
            allowStore,
            allowChat,
            allowWhatsappAutomatic,
            value,
            allowNewBookingNotifications,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withAllowNewBookingNotifications(boolean value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            maxServicePhotos,
            allowClientChooseProfessional,
            allowOnlinePayments,
            allowAnalytics,
            allowAdvancedClientProfile,
            allowAutomations,
            allowLoyalty,
            allowLastMinute,
            allowStore,
            allowChat,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            value,
            allowClientReminders
        );
    }

    public ProductPlanCapabilities withAllowClientReminders(boolean value) {
        return new ProductPlanCapabilities(
            maxProfessionals,
            maxBusinessPhotos,
            maxServicePhotos,
            allowClientChooseProfessional,
            allowOnlinePayments,
            allowAnalytics,
            allowAdvancedClientProfile,
            allowAutomations,
            allowLoyalty,
            allowLastMinute,
            allowStore,
            allowChat,
            allowWhatsappAutomatic,
            allowInAppNotifications,
            allowNewBookingNotifications,
            value
        );
    }
}

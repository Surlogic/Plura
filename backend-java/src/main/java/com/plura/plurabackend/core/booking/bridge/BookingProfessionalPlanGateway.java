package com.plura.plurabackend.core.booking.bridge;

public interface BookingProfessionalPlanGateway {

    boolean allowsOnlinePayments(Long professionalId);
}

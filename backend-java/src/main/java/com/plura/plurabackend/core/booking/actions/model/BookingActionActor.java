package com.plura.plurabackend.core.booking.actions.model;

public record BookingActionActor(
    BookingActionActorType actorType,
    Long userId,
    Long professionalId
) {
    public enum BookingActionActorType {
        CLIENT,
        PROFESSIONAL
    }
}

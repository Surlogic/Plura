package com.plura.plurabackend.core.booking.actions.model;

/**
 * BookingActionActor es un modelo inmutable del modulo reservas / acciones / modelo.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas.
 */
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

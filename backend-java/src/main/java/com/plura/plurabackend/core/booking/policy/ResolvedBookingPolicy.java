package com.plura.plurabackend.core.booking.policy;

/**
 * ResolvedBookingPolicy es un modelo inmutable del modulo reservas / politicas.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas.
 */
public record ResolvedBookingPolicy(
    BookingPolicySnapshot snapshot,
    PolicySnapshotSource source
) {
    public enum PolicySnapshotSource {
        SNAPSHOT,
        LIVE_FALLBACK
    }
}

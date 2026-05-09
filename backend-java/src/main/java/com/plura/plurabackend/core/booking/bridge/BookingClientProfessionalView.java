package com.plura.plurabackend.core.booking.bridge;

/**
 * BookingClientProfessionalView es un modelo inmutable del modulo reservas / adaptadores.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, reservas, clientes.
 */
public record BookingClientProfessionalView(
    String serviceId,
    String professionalDisplayName,
    String professionalSlug,
    String professionalLocation
) {}

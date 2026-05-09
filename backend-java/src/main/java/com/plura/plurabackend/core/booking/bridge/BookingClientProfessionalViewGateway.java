package com.plura.plurabackend.core.booking.bridge;

import com.plura.plurabackend.core.booking.model.Booking;

/**
 * BookingClientProfessionalViewGateway es un contrato interno del modulo reservas / adaptadores.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, reservas, clientes.
 */
public interface BookingClientProfessionalViewGateway {

    BookingClientProfessionalView resolveView(Booking booking);
}

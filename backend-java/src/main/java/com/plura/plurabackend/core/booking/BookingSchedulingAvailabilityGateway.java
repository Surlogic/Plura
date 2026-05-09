package com.plura.plurabackend.core.booking;

import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import java.time.LocalDateTime;
import java.util.List;

/**
 * BookingSchedulingAvailabilityGateway es un contrato interno del modulo reservas.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: disponibilidad, reservas.
 */
public interface BookingSchedulingAvailabilityGateway {

    List<String> getAvailableSlots(String slug, String rawDate, String serviceId);

    boolean isSlotAvailable(Long professionalId, String serviceId, LocalDateTime startDateTime, Long excludedBookingId);

    ProfesionalScheduleDto getSchedule(String rawUserId);

    ProfesionalScheduleDto updateSchedule(String rawUserId, ProfesionalScheduleDto request);
}

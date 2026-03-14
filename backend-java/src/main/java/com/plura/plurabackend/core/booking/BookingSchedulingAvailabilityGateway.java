package com.plura.plurabackend.core.booking;

import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import java.time.LocalDateTime;
import java.util.List;

public interface BookingSchedulingAvailabilityGateway {

    List<String> getAvailableSlots(String slug, String rawDate, String serviceId);

    boolean isSlotAvailable(Long professionalId, String serviceId, LocalDateTime startDateTime, Long excludedBookingId);

    ProfesionalScheduleDto getSchedule(String rawUserId);

    ProfesionalScheduleDto updateSchedule(String rawUserId, ProfesionalScheduleDto request);
}

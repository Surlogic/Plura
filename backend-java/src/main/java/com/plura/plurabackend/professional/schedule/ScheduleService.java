package com.plura.plurabackend.professional.schedule;

import com.plura.plurabackend.professional.schedule.application.ScheduleApplicationService;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * ScheduleService es un servicio de negocio del modulo profesionales / agenda.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: scheduleApplicationService.
 * Foco funcional: agenda, servicios.
 */
@Service
public class ScheduleService {

    private final ScheduleApplicationService scheduleApplicationService;

    public ScheduleService(ScheduleApplicationService scheduleApplicationService) {
        this.scheduleApplicationService = scheduleApplicationService;
    }

    public List<String> getAvailableSlots(String slug, String rawDate, String serviceId) {
        return scheduleApplicationService.getAvailableSlots(slug, rawDate, serviceId);
    }

    public ProfesionalScheduleDto getSchedule(String rawUserId) {
        return scheduleApplicationService.getSchedule(rawUserId);
    }

    /**
     * Actualiza agenda manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public ProfesionalScheduleDto updateSchedule(String rawUserId, ProfesionalScheduleDto request) {
        return scheduleApplicationService.updateSchedule(rawUserId, request);
    }
}

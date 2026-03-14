package com.plura.plurabackend.professional.schedule;

import com.plura.plurabackend.professional.schedule.application.ScheduleApplicationService;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import java.util.List;
import org.springframework.stereotype.Service;

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

    public ProfesionalScheduleDto updateSchedule(String rawUserId, ProfesionalScheduleDto request) {
        return scheduleApplicationService.updateSchedule(rawUserId, request);
    }
}

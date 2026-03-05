package com.plura.plurabackend.professional;

import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ScheduleService {

    private final ProfesionalPublicPageCoreService coreService;

    public ScheduleService(ProfesionalPublicPageCoreService coreService) {
        this.coreService = coreService;
    }

    public List<String> getAvailableSlots(String slug, String rawDate, String serviceId) {
        return coreService.getAvailableSlots(slug, rawDate, serviceId);
    }

    public ProfesionalScheduleDto getSchedule(String rawUserId) {
        return coreService.getSchedule(rawUserId);
    }

    public ProfesionalScheduleDto updateSchedule(String rawUserId, ProfesionalScheduleDto request) {
        return coreService.updateSchedule(rawUserId, request);
    }
}

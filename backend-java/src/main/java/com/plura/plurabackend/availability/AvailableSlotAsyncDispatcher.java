package com.plura.plurabackend.availability;

import java.time.LocalDate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class AvailableSlotAsyncDispatcher {

    private final AvailableSlotService availableSlotService;

    public AvailableSlotAsyncDispatcher(AvailableSlotService availableSlotService) {
        this.availableSlotService = availableSlotService;
    }

    @Async("availableSlotExecutor")
    public void rebuildProfessionalNextDays(Long professionalId, int days) {
        availableSlotService.rebuildProfessionalNextDays(professionalId, days);
    }

    @Async("availableSlotExecutor")
    public void rebuildProfessionalDay(Long professionalId, LocalDate date) {
        availableSlotService.rebuildProfessionalDay(professionalId, date);
    }

    @Async("availableSlotExecutor")
    public void rebuildAllNextDays(int days) {
        availableSlotService.rebuildAllNextDays(days);
    }
}

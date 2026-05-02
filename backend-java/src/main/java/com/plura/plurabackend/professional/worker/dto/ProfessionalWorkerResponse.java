package com.plura.plurabackend.professional.worker.dto;

import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.worker.model.ProfessionalWorkerStatus;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfessionalWorkerResponse {
    private String id;
    private String professionalId;
    private String userId;
    private String email;
    private String displayName;
    private ProfessionalWorkerStatus status;
    private Boolean owner;
    private ProfesionalScheduleDto schedule;
    private List<String> serviceIds;
    private LocalDateTime acceptedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

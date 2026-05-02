package com.plura.plurabackend.professional.worker.dto;

import com.plura.plurabackend.professional.worker.model.ProfessionalWorkerStatus;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProfessionalWorkerUpdateRequest {

    @Size(max = 255)
    private String displayName;

    private ProfessionalWorkerStatus status;
}

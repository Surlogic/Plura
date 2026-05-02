package com.plura.plurabackend.professional.worker.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class ProfessionalWorkerServicesUpdateRequest {

    @NotNull
    private List<@Size(max = 36) String> serviceIds;
}

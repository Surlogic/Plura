package com.plura.plurabackend.professional.worker.dto;

import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class ProfessionalWorkerInviteRequest {

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @Size(max = 255)
    private String displayName;

    private List<@Size(max = 36) String> serviceIds;

    @Valid
    private ProfesionalScheduleDto schedule;
}

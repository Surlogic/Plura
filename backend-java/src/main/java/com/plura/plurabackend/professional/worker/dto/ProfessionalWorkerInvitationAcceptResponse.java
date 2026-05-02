package com.plura.plurabackend.professional.worker.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfessionalWorkerInvitationAcceptResponse {
    private String email;
    private String displayName;
    private String professionalId;
    private String professionalName;
    private boolean accountCreated;
}

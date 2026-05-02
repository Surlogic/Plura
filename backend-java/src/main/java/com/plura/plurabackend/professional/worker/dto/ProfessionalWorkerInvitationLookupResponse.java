package com.plura.plurabackend.professional.worker.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfessionalWorkerInvitationLookupResponse {
    private String email;
    private String displayName;
    private String professionalId;
    private String professionalName;
    private LocalDateTime expiresAt;
    private boolean requiresAccountCreation;
}

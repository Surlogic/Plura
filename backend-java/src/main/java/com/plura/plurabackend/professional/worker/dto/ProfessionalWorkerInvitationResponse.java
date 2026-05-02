package com.plura.plurabackend.professional.worker.dto;

import com.plura.plurabackend.core.auth.TransactionalEmailService.DeliveryStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfessionalWorkerInvitationResponse {
    private ProfessionalWorkerResponse worker;
    private DeliveryStatus emailDeliveryStatus;
}

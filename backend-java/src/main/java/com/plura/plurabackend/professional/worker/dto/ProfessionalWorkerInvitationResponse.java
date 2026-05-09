package com.plura.plurabackend.professional.worker.dto;

import com.plura.plurabackend.core.auth.TransactionalEmailService.DeliveryStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * ProfessionalWorkerInvitationResponse es un DTO de respuesta del modulo profesionales / trabajadores / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, trabajadores.
 */
@Data
@AllArgsConstructor
public class ProfessionalWorkerInvitationResponse {
    private ProfessionalWorkerResponse worker;
    private DeliveryStatus emailDeliveryStatus;
}

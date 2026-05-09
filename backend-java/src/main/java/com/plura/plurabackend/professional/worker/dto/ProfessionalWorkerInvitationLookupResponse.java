package com.plura.plurabackend.professional.worker.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * ProfessionalWorkerInvitationLookupResponse es un DTO de respuesta del modulo profesionales / trabajadores / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, trabajadores.
 */
@Data
@AllArgsConstructor
public class ProfessionalWorkerInvitationLookupResponse {
    private String email;
    private String displayName;
    private String professionalId;
    private String professionalName;
    private LocalDateTime expiresAt;
    private boolean needsAccountCreation;
}

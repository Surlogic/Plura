package com.plura.plurabackend.professional.worker.dto;

import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.worker.model.ProfessionalWorkerStatus;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * ProfessionalWorkerResponse es un DTO de respuesta del modulo profesionales / trabajadores / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, trabajadores.
 */
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

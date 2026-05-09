package com.plura.plurabackend.core.auth.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * AuthSessionListResponse es un DTO de respuesta del modulo autenticacion / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: sesiones, autenticacion y sesiones.
 */
@Data
@AllArgsConstructor
public class AuthSessionListResponse {
    private List<AuthSessionResponse> sessions;
}

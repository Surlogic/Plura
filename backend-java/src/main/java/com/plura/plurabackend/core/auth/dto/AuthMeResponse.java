package com.plura.plurabackend.core.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.plura.plurabackend.core.auth.context.AuthContextDescriptor;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * AuthMeResponse es un DTO de respuesta del modulo autenticacion / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: autenticacion y sesiones.
 */
@Data
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthMeResponse {
    private UserResponse user;
    private AuthContextDescriptor activeContext;
    private List<AuthContextDescriptor> contexts;
}

package com.plura.plurabackend.core.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.plura.plurabackend.core.auth.context.AuthContextDescriptor;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * SelectContextResponse es un DTO de respuesta del modulo autenticacion / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
@Data
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SelectContextResponse {
    private String accessToken;
    private AuthContextDescriptor activeContext;
}

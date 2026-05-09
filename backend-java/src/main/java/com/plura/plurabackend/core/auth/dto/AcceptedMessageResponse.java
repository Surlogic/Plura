package com.plura.plurabackend.core.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * AcceptedMessageResponse es un DTO de respuesta del modulo autenticacion / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
@Data
@AllArgsConstructor
public class AcceptedMessageResponse {
    private String message;
}

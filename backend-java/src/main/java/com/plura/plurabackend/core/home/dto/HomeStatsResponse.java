package com.plura.plurabackend.core.home.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * HomeStatsResponse es un DTO de respuesta del modulo home / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: home publica.
 */
@Data
@AllArgsConstructor
public class HomeStatsResponse {
    private long activeUsers;
    private long professionals;
    private long categories;
    private long monthlyBookings;
}

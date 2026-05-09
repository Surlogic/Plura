package com.plura.plurabackend.core.auth.dto;

import java.util.List;

/**
 * AuthAuditListResponse es un modelo inmutable del modulo autenticacion / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: auditoria, autenticacion y sesiones.
 */
public record AuthAuditListResponse(List<AuthAuditEntryResponse> events) {}

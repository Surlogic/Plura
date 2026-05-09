package com.plura.plurabackend.core.auth.context;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * AuthContextDescriptor es un modelo inmutable del modulo autenticacion / contexto de sesion.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: autenticacion y sesiones.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthContextDescriptor(
    AuthContextType type,
    String professionalId,
    String professionalName,
    String professionalSlug,
    String workerId,
    String workerDisplayName,
    boolean owner
) {}

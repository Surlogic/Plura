package com.plura.plurabackend.core.auth.context;

import com.fasterxml.jackson.annotation.JsonInclude;

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

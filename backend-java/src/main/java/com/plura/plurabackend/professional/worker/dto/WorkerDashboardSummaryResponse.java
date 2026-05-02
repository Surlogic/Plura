package com.plura.plurabackend.professional.worker.dto;

public record WorkerDashboardSummaryResponse(
    String workerId,
    String displayName,
    String email,
    String status,
    String professionalId,
    String professionalName,
    String professionalSlug
) {}

package com.plura.plurabackend.auth.dto;

import java.time.LocalDateTime;

public record AuthAuditEntryResponse(
    String eventType,
    String status,
    String ipAddress,
    LocalDateTime createdAt
) {}

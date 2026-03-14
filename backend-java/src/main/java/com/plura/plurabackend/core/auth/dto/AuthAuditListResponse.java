package com.plura.plurabackend.core.auth.dto;

import java.util.List;

public record AuthAuditListResponse(List<AuthAuditEntryResponse> events) {}

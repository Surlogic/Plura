package com.plura.plurabackend.auth.dto;

import java.util.List;

public record AuthAuditListResponse(List<AuthAuditEntryResponse> events) {}

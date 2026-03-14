package com.plura.plurabackend.core.auth;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.auth.dto.AuthAuditEntryResponse;
import com.plura.plurabackend.core.auth.dto.AuthAuditListResponse;
import com.plura.plurabackend.core.auth.model.AuthAuditEventType;
import com.plura.plurabackend.core.auth.model.AuthAuditLog;
import com.plura.plurabackend.core.auth.model.AuthAuditStatus;
import com.plura.plurabackend.core.auth.repository.AuthAuditLogRepository;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthAuditService {

    private final AuthAuditLogRepository authAuditLogRepository;
    private final ObjectMapper objectMapper;

    public AuthAuditService(
        AuthAuditLogRepository authAuditLogRepository,
        ObjectMapper objectMapper
    ) {
        this.authAuditLogRepository = authAuditLogRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(
        AuthAuditEventType eventType,
        AuthAuditStatus status,
        Long userId,
        String sessionId,
        String ipAddress,
        String userAgent,
        Map<String, ?> metadata
    ) {
        AuthAuditLog log = new AuthAuditLog();
        log.setUserId(userId);
        log.setSessionId(trim(sessionId, 36));
        log.setEventType(eventType);
        log.setStatus(status);
        log.setIpAddress(trim(ipAddress, 64));
        log.setUserAgent(trim(userAgent, 500));
        log.setMetadataJson(toJson(metadata));
        authAuditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public AuthAuditListResponse getRecentEventsForUser(Long userId) {
        List<AuthAuditLog> logs = authAuditLogRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId);
        List<AuthAuditEntryResponse> entries = logs.stream()
            .map(log -> new AuthAuditEntryResponse(
                log.getEventType().name(),
                log.getStatus().name(),
                log.getIpAddress(),
                log.getCreatedAt()
            ))
            .toList();
        return new AuthAuditListResponse(entries);
    }

    public Long parseUserId(String rawUserId) {
        if (rawUserId == null || rawUserId.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(rawUserId);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String toJson(Map<String, ?> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException exception) {
            return "{\"serializationError\":true}";
        }
    }

    private String trim(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }
}

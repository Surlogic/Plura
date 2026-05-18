package com.plura.plurabackend.core.observability.ops;

import com.plura.plurabackend.core.observability.model.AppErrorIncident;
import com.plura.plurabackend.core.observability.model.AppErrorSeverity;
import com.plura.plurabackend.core.observability.model.AppErrorSource;
import com.plura.plurabackend.core.observability.ops.dto.InternalAppErrorAnalyticsResponse;
import com.plura.plurabackend.core.observability.ops.dto.InternalAppErrorDetailResponse;
import com.plura.plurabackend.core.observability.ops.dto.InternalAppErrorListItemResponse;
import com.plura.plurabackend.core.observability.repository.AppErrorIncidentRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InternalAppErrorOpsService {

    private final AppErrorIncidentRepository appErrorIncidentRepository;

    public InternalAppErrorOpsService(AppErrorIncidentRepository appErrorIncidentRepository) {
        this.appErrorIncidentRepository = appErrorIncidentRepository;
    }

    @Transactional(readOnly = true)
    public Page<InternalAppErrorListItemResponse> list(
        int page,
        int size,
        String source,
        String severity,
        Boolean resolved,
        String from,
        String to
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        AppErrorSource sourceFilter = parseEnum(source, AppErrorSource.class);
        AppErrorSeverity severityFilter = parseEnum(severity, AppErrorSeverity.class);
        LocalDateTime fromDt = parseDate(from, true);
        LocalDateTime toDt = parseDate(to, false);
        return appErrorIncidentRepository.findAllFiltered(
            sourceFilter,
            severityFilter,
            resolved,
            fromDt,
            toDt,
            PageRequest.of(safePage, safeSize)
        ).map(this::toListItem);
    }

    @Transactional(readOnly = true)
    public InternalAppErrorDetailResponse detail(Long id) {
        AppErrorIncident incident = appErrorIncidentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Incidente no encontrado"));
        return toDetail(incident);
    }

    @Transactional(readOnly = true)
    public InternalAppErrorAnalyticsResponse analytics(String from, String to) {
        LocalDateTime fromDt = parseDate(from, true);
        LocalDateTime toDt = parseDate(to, false);
        Map<String, Long> bySource = appErrorIncidentRepository.countBySource(fromDt, toDt).stream()
            .collect(Collectors.toMap(
                row -> ((AppErrorSource) row[0]).name(),
                row -> (Long) row[1],
                (a, b) -> a,
                LinkedHashMap::new
            ));
        Map<String, Long> bySeverity = appErrorIncidentRepository.countBySeverity(fromDt, toDt).stream()
            .collect(Collectors.toMap(
                row -> ((AppErrorSeverity) row[0]).name(),
                row -> (Long) row[1],
                (a, b) -> a,
                LinkedHashMap::new
            ));
        return new InternalAppErrorAnalyticsResponse(
            appErrorIncidentRepository.count(),
            appErrorIncidentRepository.countOpenIncidents(),
            appErrorIncidentRepository.countSeenInRange(fromDt, toDt),
            bySource,
            bySeverity
        );
    }

    private InternalAppErrorListItemResponse toListItem(AppErrorIncident incident) {
        return new InternalAppErrorListItemResponse(
            incident.getId(),
            incident.getSource().name(),
            incident.getSeverity().name(),
            incident.getErrorType(),
            incident.getMessage(),
            incident.getRoute(),
            incident.getHttpMethod(),
            incident.getHttpStatus(),
            incident.getTraceId(),
            incident.getOccurrenceCount(),
            incident.getFirstSeenAt().toString(),
            incident.getLastSeenAt().toString(),
            incident.getResolvedAt() == null ? null : incident.getResolvedAt().toString()
        );
    }

    private InternalAppErrorDetailResponse toDetail(AppErrorIncident incident) {
        return new InternalAppErrorDetailResponse(
            incident.getId(),
            incident.getFingerprint(),
            incident.getSource().name(),
            incident.getSeverity().name(),
            incident.getErrorType(),
            incident.getMessage(),
            incident.getStackTrace(),
            incident.getRoute(),
            incident.getHttpMethod(),
            incident.getHttpStatus(),
            incident.getTraceId(),
            incident.getClientSessionId(),
            incident.getContextJson(),
            incident.getOccurrenceCount(),
            incident.getFirstSeenAt().toString(),
            incident.getLastSeenAt().toString(),
            incident.getResolvedAt() == null ? null : incident.getResolvedAt().toString()
        );
    }

    private <T extends Enum<T>> T parseEnum(String value, Class<T> enumType) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Enum.valueOf(enumType, value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valor invalido: " + value);
        }
    }

    private LocalDateTime parseDate(String value, boolean startOfDay) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            LocalDate date = LocalDate.parse(value.trim());
            return startOfDay ? date.atStartOfDay() : date.plusDays(1).atStartOfDay();
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha invalida: " + value + ". Formato esperado: YYYY-MM-DD");
        }
    }
}

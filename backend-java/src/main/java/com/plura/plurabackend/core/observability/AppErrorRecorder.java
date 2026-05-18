package com.plura.plurabackend.core.observability;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.observability.dto.ClientErrorReportRequest;
import com.plura.plurabackend.core.observability.model.AppErrorIncident;
import com.plura.plurabackend.core.observability.model.AppErrorSeverity;
import com.plura.plurabackend.core.observability.model.AppErrorSource;
import com.plura.plurabackend.core.observability.repository.AppErrorIncidentRepository;
import com.plura.plurabackend.core.observability.trace.TraceContext;
import jakarta.servlet.http.HttpServletRequest;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AppErrorRecorder {

    private static final Logger LOGGER = LoggerFactory.getLogger(AppErrorRecorder.class);
    private static final Pattern UUID_PATTERN = Pattern.compile(
        "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
    );
    private static final Pattern NUMBER_PATTERN = Pattern.compile("(?<=/)\\d+(?=/|$)");
    private static final int MESSAGE_LIMIT = 4000;
    private static final int STACK_LIMIT = 12000;
    private static final int CONTEXT_LIMIT = 12000;

    private final AppErrorIncidentRepository appErrorIncidentRepository;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;
    private final boolean enabled;

    public AppErrorRecorder(
        AppErrorIncidentRepository appErrorIncidentRepository,
        ObjectMapper objectMapper,
        PlatformTransactionManager transactionManager,
        @Value("${app.observability.error-tracking.enabled:true}") boolean enabled
    ) {
        this.appErrorIncidentRepository = appErrorIncidentRepository;
        this.objectMapper = objectMapper;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.enabled = enabled;
    }

    public void recordBackendException(Throwable throwable, HttpServletRequest request, int httpStatus) {
        if (!enabled) {
            return;
        }
        String route = request == null ? null : request.getRequestURI();
        String method = request == null ? null : request.getMethod();
        safelyRecord(() -> record(
            AppErrorSource.BACKEND,
            AppErrorSeverity.ERROR,
            throwable,
            route,
            method,
            httpStatus,
            TraceContext.currentTraceId(),
            null,
            contextFromRequest(request)
        ));
    }

    public void recordAsyncException(Throwable throwable, Method method, Object[] params) {
        if (!enabled) {
            return;
        }
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("method", method == null ? null : method.toGenericString());
        context.put("params", params == null ? null : Arrays.stream(params).map(String::valueOf).toList());
        safelyRecord(() -> record(
            AppErrorSource.ASYNC,
            AppErrorSeverity.ERROR,
            throwable,
            method == null ? null : method.getDeclaringClass().getSimpleName() + "." + method.getName(),
            null,
            null,
            TraceContext.currentTraceId(),
            null,
            context
        ));
    }

    public void recordBackgroundException(Throwable throwable, String operation, Map<String, Object> context) {
        if (!enabled) {
            return;
        }
        safelyRecord(() -> record(
            AppErrorSource.ASYNC,
            AppErrorSeverity.ERROR,
            throwable,
            operation,
            null,
            null,
            TraceContext.currentTraceId(),
            null,
            context == null ? Map.of() : context
        ));
    }

    public void recordClientError(ClientErrorReportRequest request, HttpServletRequest servletRequest) {
        if (!enabled) {
            return;
        }
        AppErrorSource source = parseSource(request.source());
        AppErrorSeverity severity = parseSeverity(request.severity());
        Map<String, Object> context = new LinkedHashMap<>();
        if (request.context() != null) {
            context.putAll(request.context());
        }
        if (servletRequest != null) {
            context.putIfAbsent("userAgent", servletRequest.getHeader("User-Agent"));
            context.putIfAbsent("clientPlatform", servletRequest.getHeader("X-Plura-Client-Platform"));
        }
        String errorType = firstNonBlank(request.errorType(), "ClientError");
        String message = sanitize(request.message(), MESSAGE_LIMIT);
        String stackTrace = sanitize(request.stackTrace(), STACK_LIMIT);
        String preferredTraceId = firstNonBlank(request.traceId(), TraceContext.currentTraceId());
        safelyRecord(() -> record(
            source,
            severity,
            errorType,
            message,
            stackTrace,
            request.route(),
            request.httpMethod(),
            request.httpStatus(),
            preferredTraceId,
            request.sessionId(),
            context
        ));
    }

    private void record(
        AppErrorSource source,
        AppErrorSeverity severity,
        Throwable throwable,
        String route,
        String httpMethod,
        Integer httpStatus,
        String traceId,
        String clientSessionId,
        Map<String, Object> context
    ) {
        String errorType = throwable == null ? "UnknownError" : throwable.getClass().getName();
        String message = throwable == null
            ? "Unknown error"
            : firstNonBlank(throwable.getMessage(), throwable.getClass().getSimpleName());
        String stackTrace = throwable == null ? null : stackTraceOf(throwable);
        record(
            source,
            severity,
            errorType,
            message,
            stackTrace,
            route,
            httpMethod,
            httpStatus,
            traceId,
            clientSessionId,
            context
        );
    }

    private void record(
        AppErrorSource source,
        AppErrorSeverity severity,
        String errorType,
        String message,
        String stackTrace,
        String route,
        String httpMethod,
        Integer httpStatus,
        String traceId,
        String clientSessionId,
        Map<String, Object> context
    ) {
        String safeRoute = sanitize(route, 512);
        String safeErrorType = sanitize(errorType, 255);
        String safeMessage = sanitize(message, MESSAGE_LIMIT);
        String safeStack = sanitize(stackTrace, STACK_LIMIT);
        String fingerprint = fingerprint(source, safeErrorType, safeRoute, safeStack);
        LocalDateTime now = LocalDateTime.now();
        String contextJson = serializeContext(context);

        AppErrorIncident incident = appErrorIncidentRepository.findByFingerprint(fingerprint).orElse(null);
        if (incident == null) {
            incident = new AppErrorIncident();
            incident.setFingerprint(fingerprint);
            incident.setSource(source);
            incident.setSeverity(severity);
            incident.setFirstSeenAt(now);
            incident.setOccurrenceCount(1L);
        } else {
            incident.setOccurrenceCount(incident.getOccurrenceCount() + 1);
        }
        incident.setSeverity(severity);
        incident.setErrorType(safeErrorType);
        incident.setMessage(safeMessage);
        incident.setStackTrace(safeStack);
        incident.setRoute(safeRoute);
        incident.setHttpMethod(sanitize(httpMethod, 16));
        incident.setHttpStatus(httpStatus);
        incident.setTraceId(sanitize(traceId, 128));
        incident.setClientSessionId(sanitize(clientSessionId, 128));
        incident.setContextJson(contextJson);
        incident.setLastSeenAt(now);
        incident.setResolvedAt(null);
        appErrorIncidentRepository.save(incident);
    }

    private Map<String, Object> contextFromRequest(HttpServletRequest request) {
        Map<String, Object> context = new LinkedHashMap<>();
        if (request == null) {
            return context;
        }
        context.put("queryString", sanitize(request.getQueryString(), 2000));
        context.put("userAgent", sanitize(request.getHeader("User-Agent"), 500));
        context.put("clientPlatform", sanitize(request.getHeader("X-Plura-Client-Platform"), 40));
        return context;
    }

    private AppErrorSource parseSource(String raw) {
        AppErrorSource source;
        try {
            source = AppErrorSource.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (Exception exception) {
            throw new IllegalArgumentException("source invalido");
        }
        if (source != AppErrorSource.WEB && source != AppErrorSource.MOBILE) {
            throw new IllegalArgumentException("source invalido");
        }
        return source;
    }

    private AppErrorSeverity parseSeverity(String raw) {
        if (raw == null || raw.isBlank()) {
            return AppErrorSeverity.ERROR;
        }
        try {
            return AppErrorSeverity.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (Exception exception) {
            throw new IllegalArgumentException("severity invalida");
        }
    }

    private String fingerprint(AppErrorSource source, String errorType, String route, String stackTrace) {
        String topFrame = topFrame(stackTrace);
        String normalizedRoute = normalizeRoute(route);
        String basis = source.name() + "|" + firstNonBlank(errorType, "UnknownError") + "|" + normalizedRoute + "|" + topFrame;
        return sha256(basis);
    }

    private String topFrame(String stackTrace) {
        if (stackTrace == null || stackTrace.isBlank()) {
            return "no-stack";
        }
        return Arrays.stream(stackTrace.split("\\R"))
            .map(String::trim)
            .filter(line -> line.startsWith("at ") || line.startsWith("com.") || line.startsWith("apps/"))
            .findFirst()
            .orElseGet(() -> stackTrace.lines().findFirst().orElse("no-stack"));
    }

    private String normalizeRoute(String route) {
        if (route == null || route.isBlank()) {
            return "no-route";
        }
        String normalized = route.split("\\?")[0];
        normalized = UUID_PATTERN.matcher(normalized).replaceAll("{uuid}");
        normalized = NUMBER_PATTERN.matcher(normalized).replaceAll("{id}");
        return normalized;
    }

    private String stackTraceOf(Throwable throwable) {
        StringWriter writer = new StringWriter();
        throwable.printStackTrace(new PrintWriter(writer));
        return sanitize(writer.toString(), STACK_LIMIT);
    }

    private String serializeContext(Map<String, Object> context) {
        if (context == null || context.isEmpty()) {
            return null;
        }
        try {
            return sanitize(objectMapper.writeValueAsString(context), CONTEXT_LIMIT);
        } catch (JsonProcessingException exception) {
            return sanitize(context.toString(), CONTEXT_LIMIT);
        }
    }

    private String firstNonBlank(String first, String fallback) {
        return first == null || first.isBlank() ? fallback : first;
    }

    private String sanitize(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte current : hash) {
                builder.append(String.format("%02x", current & 0xff));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 no disponible", exception);
        }
    }

    private void safelyRecord(Runnable action) {
        try {
            transactionTemplate.executeWithoutResult(ignored -> action.run());
        } catch (RuntimeException exception) {
            LOGGER.warn("No se pudo persistir incidente de observabilidad: {}", exception.getMessage());
        }
    }
}

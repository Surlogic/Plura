package com.plura.plurabackend.config.error;

import com.plura.plurabackend.auth.oauth.AppleEmailRequiredFirstLoginException;
import com.plura.plurabackend.auth.oauth.OAuthProviderMismatchException;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValid(
        MethodArgumentNotValidException exception,
        HttpServletRequest request
    ) {
        String message = exception.getBindingResult().getFieldErrors().stream()
            .map(this::formatFieldError)
            .collect(Collectors.joining("; "));
        if (message.isBlank()) {
            message = "Validation failed";
        }
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(
        ConstraintViolationException exception,
        HttpServletRequest request
    ) {
        String message = exception.getConstraintViolations().stream()
            .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
            .collect(Collectors.joining("; "));
        if (message.isBlank()) {
            message = "Validation constraint violation";
        }
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(
        IllegalArgumentException exception,
        HttpServletRequest request
    ) {
        String message = exception.getMessage() == null || exception.getMessage().isBlank()
            ? "Invalid argument"
            : exception.getMessage();
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "ILLEGAL_ARGUMENT", message, request);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleEntityNotFound(
        EntityNotFoundException exception,
        HttpServletRequest request
    ) {
        String message = exception.getMessage() == null || exception.getMessage().isBlank()
            ? "Entity not found"
            : exception.getMessage();
        return buildErrorResponse(HttpStatus.NOT_FOUND, "ENTITY_NOT_FOUND", message, request);
    }

    @ExceptionHandler(OAuthProviderMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleOAuthProviderMismatch(
        OAuthProviderMismatchException exception,
        HttpServletRequest request
    ) {
        String message = exception.getMessage() == null || exception.getMessage().isBlank()
            ? "Email already linked to a different provider"
            : exception.getMessage();
        return buildErrorResponse(HttpStatus.CONFLICT, "OAUTH_PROVIDER_MISMATCH", message, request);
    }

    @ExceptionHandler(AppleEmailRequiredFirstLoginException.class)
    public ResponseEntity<ApiErrorResponse> handleAppleEmailRequiredFirstLogin(
        AppleEmailRequiredFirstLoginException exception,
        HttpServletRequest request
    ) {
        String message = exception.getMessage() == null || exception.getMessage().isBlank()
            ? "Apple did not provide email. Please complete first login from Apple flow that includes email."
            : exception.getMessage();
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "APPLE_EMAIL_REQUIRED_FIRST_LOGIN", message, request);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(
        ResponseStatusException exception,
        HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.resolve(exception.getStatusCode().value());
        if (status == null) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        String message = exception.getReason();
        if (message == null || message.isBlank()) {
            message = status.getReasonPhrase();
        }
        String error = status.name();
        return buildErrorResponse(status, error, message, request);
    }

    private String formatFieldError(FieldError fieldError) {
        String field = fieldError.getField() == null ? "field" : fieldError.getField();
        String message = fieldError.getDefaultMessage() == null ? "invalid value" : fieldError.getDefaultMessage();
        return field + ": " + message;
    }

    private ResponseEntity<ApiErrorResponse> buildErrorResponse(
        HttpStatus status,
        String error,
        String message,
        HttpServletRequest request
    ) {
        ApiErrorResponse response = new ApiErrorResponse(
            Instant.now().toString(),
            status.value(),
            error,
            message,
            request.getRequestURI()
        );
        return ResponseEntity.status(status).body(response);
    }

    public record ApiErrorResponse(
        String timestamp,
        int status,
        String error,
        String message,
        String path
    ) {}
}

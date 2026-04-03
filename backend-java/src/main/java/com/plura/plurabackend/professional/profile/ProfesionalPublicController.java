package com.plura.plurabackend.professional.profile;

import com.plura.plurabackend.core.analytics.tracking.AppProductEventTrackingService;
import com.plura.plurabackend.core.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.core.booking.dto.PublicBookingResponse;
import jakarta.validation.Valid;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/public/profesionales")
public class ProfesionalPublicController {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProfesionalPublicController.class);
    private static final String BOOKING_SLOT_CONSTRAINT = "uq_professional_start";
    private final ProfessionalPublicPageService professionalPublicPageService;
    private final AppProductEventTrackingService appProductEventTrackingService;

    public ProfesionalPublicController(
        ProfessionalPublicPageService professionalPublicPageService,
        AppProductEventTrackingService appProductEventTrackingService
    ) {
        this.professionalPublicPageService = professionalPublicPageService;
        this.appProductEventTrackingService = appProductEventTrackingService;
    }

    @GetMapping
    public List<ProfesionalPublicSummaryResponse> listProfesionales(
        @RequestParam(required = false) Integer limit,
        @RequestParam(required = false) Integer page,
        @RequestParam(required = false) Integer size,
        @RequestParam(required = false) UUID categoryId,
        @RequestParam(required = false) String categorySlug
    ) {
        return professionalPublicPageService.listPublicProfessionals(limit, page, size, categoryId, categorySlug);
    }

    @GetMapping("/{slug}")
    public ProfesionalPublicPageResponse getProfesionalBySlug(
        @PathVariable String slug,
        @RequestHeader(value = "X-Plura-Client-Platform", required = false) String clientPlatform
    ) {
        ProfesionalPublicPageResponse response = professionalPublicPageService.getPublicPageBySlug(slug);
        appProductEventTrackingService.trackProfessionalProfileView(clientPlatform, response);
        return response;
    }

    @GetMapping("/{slug}/slots")
    public List<String> getAvailableSlots(
        @PathVariable String slug,
        @RequestParam String date,
        @RequestParam String serviceId
    ) {
        return professionalPublicPageService.getAvailableSlots(slug, date, serviceId);
    }

    @PostMapping("/{slug}/reservas")
    public ResponseEntity<?> createReservation(
        @PathVariable String slug,
        @Valid @RequestBody PublicBookingRequest request,
        @RequestHeader(value = "X-Plura-Client-Platform", required = false) String clientPlatform,
        Authentication authentication
    ) {
        if (
            authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || authentication.getPrincipal() == null
        ) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }

        try {
            PublicBookingResponse response = professionalPublicPageService.createPublicBooking(
                slug,
                request,
                authentication.getPrincipal().toString(),
                clientPlatform
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (DataIntegrityViolationException exception) {
            if (!isBookingSlotConflict(exception)) {
                LOGGER.error("Error de integridad inesperado al crear reserva pública para slug {}", slug, exception);
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    resolveIntegrityErrorMessage(exception)
                );
            }
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "El horario ya fue reservado."));
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode() == HttpStatus.CONFLICT) {
                String message = exception.getReason() == null || exception.getReason().isBlank()
                    ? "El horario ya fue reservado."
                    : exception.getReason();
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
            }
            throw exception;
        }
    }

    private boolean isBookingSlotConflict(DataIntegrityViolationException exception) {
        if (hasUniqueViolationSqlState(exception)) {
            return true;
        }

        Throwable rootCause = NestedExceptionUtils.getMostSpecificCause(exception);
        if (rootCause == null || rootCause.getMessage() == null) {
            return false;
        }
        String message = rootCause.getMessage();
        String lower = message.toLowerCase();
        return message.contains(BOOKING_SLOT_CONSTRAINT)
            || (lower.contains("duplicate key")
                && lower.contains("professional_id")
                && (lower.contains("start_date_time") || lower.contains("startdatetime")));
    }

    private boolean hasUniqueViolationSqlState(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof SQLException sqlException && "23505".equals(sqlException.getSQLState())) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private String resolveIntegrityErrorMessage(DataIntegrityViolationException exception) {
        Throwable rootCause = NestedExceptionUtils.getMostSpecificCause(exception);
        if (rootCause == null || rootCause.getMessage() == null || rootCause.getMessage().isBlank()) {
            return "No se pudo crear la reserva por una validación de datos en la base";
        }

        String message = rootCause.getMessage();
        String lower = message.toLowerCase();

        if (lower.contains("not-null") || lower.contains("null value in column")) {
            return "No se pudo crear la reserva: faltan datos obligatorios en el servicio o la reserva";
        }
        if (lower.contains("foreign key")) {
            return "No se pudo crear la reserva: referencia inválida de servicio, usuario o profesional";
        }
        if (lower.contains("value too long") || lower.contains("too long for type")) {
            return "No se pudo crear la reserva: hay campos con longitud mayor a la permitida";
        }

        return "No se pudo crear la reserva por una validación de datos en la base";
    }
}

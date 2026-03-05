package com.plura.plurabackend.professional;

import com.plura.plurabackend.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.booking.dto.PublicBookingResponse;
import jakarta.validation.Valid;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/public/profesionales")
public class ProfesionalPublicController {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProfesionalPublicController.class);
    private static final String BOOKING_SLOT_CONSTRAINT = "uq_professional_start";
    private final ProfesionalPublicPageService profesionalPublicPageService;

    public ProfesionalPublicController(ProfesionalPublicPageService profesionalPublicPageService) {
        this.profesionalPublicPageService = profesionalPublicPageService;
    }

    @GetMapping
    public List<ProfesionalPublicSummaryResponse> listProfesionales(
        @RequestParam(required = false) Integer limit,
        @RequestParam(required = false) Integer page,
        @RequestParam(required = false) Integer size,
        @RequestParam(required = false) UUID categoryId,
        @RequestParam(required = false) String categorySlug
    ) {
        return profesionalPublicPageService.listPublicProfessionals(limit, page, size, categoryId, categorySlug);
    }

    @GetMapping("/{slug}")
    public ProfesionalPublicPageResponse getProfesionalBySlug(@PathVariable String slug) {
        return profesionalPublicPageService.getPublicPageBySlug(slug);
    }

    @GetMapping("/{slug}/slots")
    public List<String> getAvailableSlots(
        @PathVariable String slug,
        @RequestParam String date,
        @RequestParam String serviceId
    ) {
        return profesionalPublicPageService.getAvailableSlots(slug, date, serviceId);
    }

    @PostMapping("/{slug}/reservas")
    public ResponseEntity<?> createReservation(
        @PathVariable String slug,
        @Valid @RequestBody PublicBookingRequest request,
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
            PublicBookingResponse response = profesionalPublicPageService.createPublicBooking(
                slug,
                request,
                authentication.getPrincipal().toString()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (DataIntegrityViolationException exception) {
            if (!isBookingSlotConflict(exception)) {
                LOGGER.error("Error de integridad inesperado al crear reserva pública para slug {}", slug, exception);
                throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo crear la reserva"
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
        Throwable rootCause = NestedExceptionUtils.getMostSpecificCause(exception);
        if (rootCause == null || rootCause.getMessage() == null) {
            return false;
        }
        return rootCause.getMessage().contains(BOOKING_SLOT_CONSTRAINT);
    }
}

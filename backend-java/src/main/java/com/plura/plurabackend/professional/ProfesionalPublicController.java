package com.plura.plurabackend.professional;

import com.plura.plurabackend.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.booking.dto.PublicBookingResponse;
import jakarta.validation.Valid;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    private final ProfesionalPublicPageService profesionalPublicPageService;

    public ProfesionalPublicController(ProfesionalPublicPageService profesionalPublicPageService) {
        this.profesionalPublicPageService = profesionalPublicPageService;
    }

    @GetMapping
    public List<ProfesionalPublicSummaryResponse> listProfesionales(
        @RequestParam(required = false) Integer limit
    ) {
        return profesionalPublicPageService.listPublicProfessionals(limit);
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
    public ResponseEntity<PublicBookingResponse> createReservation(
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

        PublicBookingResponse response = profesionalPublicPageService.createPublicBooking(
            slug,
            request,
            authentication.getPrincipal().toString()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}

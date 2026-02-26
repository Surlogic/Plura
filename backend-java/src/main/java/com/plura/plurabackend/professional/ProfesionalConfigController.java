package com.plura.plurabackend.professional;

import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.dto.ProfessionalBookingUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalBusinessProfileUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageUpdateRequest;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/profesional")
public class ProfesionalConfigController {

    private final ProfesionalPublicPageService profesionalPublicPageService;

    public ProfesionalConfigController(ProfesionalPublicPageService profesionalPublicPageService) {
        this.profesionalPublicPageService = profesionalPublicPageService;
    }

    @GetMapping("/public-page")
    public ProfesionalPublicPageResponse getPublicPageConfig() {
        return profesionalPublicPageService.getPublicPageByProfesionalId(getProfesionalId());
    }

    @PutMapping("/public-page")
    public ProfesionalPublicPageResponse updatePublicPageConfig(
        @RequestBody ProfesionalPublicPageUpdateRequest request
    ) {
        return profesionalPublicPageService.updatePublicPage(getProfesionalId(), request);
    }

    @PutMapping("/profile")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateBusinessProfile(@RequestBody ProfesionalBusinessProfileUpdateRequest request) {
        profesionalPublicPageService.updateBusinessProfile(getProfesionalId(), request);
    }

    @GetMapping("/schedule")
    public ProfesionalScheduleDto getSchedule() {
        return profesionalPublicPageService.getSchedule(getProfesionalId());
    }

    @PutMapping("/schedule")
    public ProfesionalScheduleDto updateSchedule(@RequestBody ProfesionalScheduleDto request) {
        return profesionalPublicPageService.updateSchedule(getProfesionalId(), request);
    }

    @GetMapping("/services")
    public List<ProfesionalServiceResponse> listServices() {
        return profesionalPublicPageService.listServices(getProfesionalId());
    }

    @PostMapping("/services")
    @ResponseStatus(HttpStatus.CREATED)
    public ProfesionalServiceResponse createService(@RequestBody ProfesionalServiceRequest request) {
        return profesionalPublicPageService.createService(getProfesionalId(), request);
    }

    @PutMapping("/services/{id}")
    public ProfesionalServiceResponse updateService(
        @PathVariable("id") String serviceId,
        @RequestBody ProfesionalServiceRequest request
    ) {
        return profesionalPublicPageService.updateService(getProfesionalId(), serviceId, request);
    }

    @DeleteMapping("/services/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteService(@PathVariable("id") String serviceId) {
        profesionalPublicPageService.deleteService(getProfesionalId(), serviceId);
    }

    @GetMapping("/reservas")
    public List<ProfessionalBookingResponse> listReservations(
        @RequestParam(required = false) String date,
        @RequestParam(required = false) String dateFrom,
        @RequestParam(required = false) String dateTo
    ) {
        return profesionalPublicPageService.getProfessionalBookings(
            getProfesionalId(),
            date,
            dateFrom,
            dateTo
        );
    }

    @PutMapping("/reservas/{id}")
    public ProfessionalBookingResponse updateReservation(
        @PathVariable("id") Long bookingId,
        @Valid @RequestBody ProfessionalBookingUpdateRequest request
    ) {
        return profesionalPublicPageService.updateProfessionalBooking(getProfesionalId(), bookingId, request);
    }

    private String getProfesionalId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sin sesión activa");
        }

        boolean isProfesional = authentication.getAuthorities().stream()
            .anyMatch(auth -> "ROLE_PROFESSIONAL".equals(auth.getAuthority()));
        if (!isProfesional) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo profesionales");
        }

        return authentication.getPrincipal().toString();
    }
}

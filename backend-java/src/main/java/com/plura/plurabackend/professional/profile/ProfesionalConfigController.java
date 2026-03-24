package com.plura.plurabackend.professional.profile;

import com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingCreateRequest;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingUpdateRequest;
import com.plura.plurabackend.core.booking.dto.BookingPolicyResponse;
import com.plura.plurabackend.core.booking.dto.BookingPolicyUpdateRequest;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.professional.dto.ProfesionalBusinessProfileUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageUpdateRequest;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.service.ServiceImageStorageService;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/profesional")
public class ProfesionalConfigController {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProfesionalConfigController.class);

    private final ProfessionalPublicPageService professionalPublicPageService;
    private final ServiceImageStorageService serviceImageStorageService;
    private final RoleGuard roleGuard;

    public ProfesionalConfigController(
        ProfessionalPublicPageService professionalPublicPageService,
        ServiceImageStorageService serviceImageStorageService,
        RoleGuard roleGuard
    ) {
        this.professionalPublicPageService = professionalPublicPageService;
        this.serviceImageStorageService = serviceImageStorageService;
        this.roleGuard = roleGuard;
    }

    @GetMapping("/public-page")
    public ProfesionalPublicPageResponse getPublicPageConfig() {
        return professionalPublicPageService.getPublicPageByProfesionalId(getProfesionalId());
    }

    @PutMapping("/public-page")
    public ProfesionalPublicPageResponse updatePublicPageConfig(
        @Valid @RequestBody ProfesionalPublicPageUpdateRequest request
    ) {
        return professionalPublicPageService.updatePublicPage(getProfesionalId(), request);
    }

    @PutMapping("/profile")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateBusinessProfile(@Valid @RequestBody ProfesionalBusinessProfileUpdateRequest request) {
        professionalPublicPageService.updateBusinessProfile(getProfesionalId(), request);
    }

    @GetMapping("/schedule")
    public ProfesionalScheduleDto getSchedule() {
        return professionalPublicPageService.getSchedule(getProfesionalId());
    }

    @GetMapping("/booking-policy")
    public BookingPolicyResponse getBookingPolicy() {
        return professionalPublicPageService.getBookingPolicy(getProfesionalId());
    }

    @PutMapping("/booking-policy")
    public BookingPolicyResponse updateBookingPolicy(@Valid @RequestBody BookingPolicyUpdateRequest request) {
        return professionalPublicPageService.updateBookingPolicy(getProfesionalId(), request);
    }

    @PutMapping("/schedule")
    public ProfesionalScheduleDto updateSchedule(@Valid @RequestBody ProfesionalScheduleDto request) {
        return professionalPublicPageService.updateSchedule(getProfesionalId(), request);
    }

    @GetMapping("/services")
    public List<ProfesionalServiceResponse> listServices() {
        return professionalPublicPageService.listServices(getProfesionalId());
    }

    @PostMapping("/services")
    @ResponseStatus(HttpStatus.CREATED)
    public ProfesionalServiceResponse createService(@Valid @RequestBody ProfesionalServiceRequest request) {
        return professionalPublicPageService.createService(getProfesionalId(), request);
    }

    @PostMapping(path = "/services/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadServiceImage(@RequestPart("file") MultipartFile file) {
        String imageUrl = serviceImageStorageService.storeProfessionalImage(file, "services", getProfesionalId());
        return Map.of("imageUrl", imageUrl);
    }

    @PostMapping(path = "/images/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadProfessionalImage(
        @RequestPart("file") MultipartFile file,
        @RequestParam(name = "kind", defaultValue = "misc") String kind
    ) {
        String normalizedKind = switch (kind == null ? "" : kind.trim().toLowerCase()) {
            case "logo" -> "logos";
            case "banner" -> "banners";
            case "gallery", "public-gallery", "public_photo", "public-photo" -> "gallery";
            case "service", "services" -> "services";
            default -> "misc";
        };
        String imageUrl = serviceImageStorageService.storeProfessionalImage(file, normalizedKind, getProfesionalId());
        return Map.of("imageUrl", imageUrl);
    }

    @PutMapping("/services/{id}")
    public ProfesionalServiceResponse updateService(
        @PathVariable("id") String serviceId,
        @Valid @RequestBody ProfesionalServiceRequest request
    ) {
        return professionalPublicPageService.updateService(getProfesionalId(), serviceId, request);
    }

    @DeleteMapping("/services/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteService(@PathVariable("id") String serviceId) {
        professionalPublicPageService.deleteService(getProfesionalId(), serviceId);
    }

    @GetMapping("/reservas")
    public List<ProfessionalBookingResponse> listReservations(
        @RequestParam(required = false) String date,
        @RequestParam(required = false) String dateFrom,
        @RequestParam(required = false) String dateTo
    ) {
        return professionalPublicPageService.getProfessionalBookings(
            getProfesionalId(),
            date,
            dateFrom,
            dateTo
        );
    }

    @PostMapping("/reservas")
    @ResponseStatus(HttpStatus.CREATED)
    public ProfessionalBookingResponse createReservation(
        @Valid @RequestBody ProfessionalBookingCreateRequest request
    ) {
        try {
            return professionalPublicPageService.createProfessionalBooking(getProfesionalId(), request);
        } catch (DataIntegrityViolationException exception) {
            LOGGER.warn("Conflicto de integridad al crear reserva profesional", exception);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El horario ya fue reservado");
        }
    }

    @PutMapping("/reservas/{id}")
    public ProfessionalBookingResponse updateReservation(
        @PathVariable("id") Long bookingId,
        @Valid @RequestBody ProfessionalBookingUpdateRequest request
    ) {
        return professionalPublicPageService.updateProfessionalBooking(getProfesionalId(), bookingId, request);
    }

    private String getProfesionalId() {
        return String.valueOf(roleGuard.requireProfessional());
    }
}
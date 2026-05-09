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

/**
 * ProfesionalConfigController es un controlador REST del modulo profesionales / perfil.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /profesional y deja la logica pesada en servicios.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
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

    /**
     * Endpoint PUT /public-page: Actualiza publico pagina configuracion manteniendo reglas de negocio y consistencia de datos.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @PutMapping("/public-page")
    public ProfesionalPublicPageResponse updatePublicPageConfig(
        @Valid @RequestBody ProfesionalPublicPageUpdateRequest request
    ) {
        return professionalPublicPageService.updatePublicPage(getProfesionalId(), request);
    }

    /**
     * Endpoint PUT /profile: Actualiza business perfil manteniendo reglas de negocio y consistencia de datos.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
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

    /**
     * Endpoint PUT /booking-policy: Actualiza reserva politica manteniendo reglas de negocio y consistencia de datos.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @PutMapping("/booking-policy")
    public BookingPolicyResponse updateBookingPolicy(@Valid @RequestBody BookingPolicyUpdateRequest request) {
        return professionalPublicPageService.updateBookingPolicy(getProfesionalId(), request);
    }

    /**
     * Endpoint PUT /schedule: Actualiza agenda manteniendo reglas de negocio y consistencia de datos.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @PutMapping("/schedule")
    public ProfesionalScheduleDto updateSchedule(@Valid @RequestBody ProfesionalScheduleDto request) {
        return professionalPublicPageService.updateSchedule(getProfesionalId(), request);
    }

    /**
     * Devuelve el listado de servicios aplicando permisos y filtros del caso de uso.
     */
    @GetMapping("/services")
    public List<ProfesionalServiceResponse> listServices() {
        return professionalPublicPageService.listServices(getProfesionalId());
    }

    /**
     * Endpoint POST /services: Crea servicio validando datos de entrada y persistiendo el resultado.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @PostMapping("/services")
    @ResponseStatus(HttpStatus.CREATED)
    public ProfesionalServiceResponse createService(@Valid @RequestBody ProfesionalServiceRequest request) {
        return professionalPublicPageService.createService(getProfesionalId(), request);
    }

    /**
     * Ejecuta la logica de upload servicio imagen manteniendola encapsulada en este componente.
     */
    @PostMapping(path = "/services/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadServiceImage(@RequestPart("file") MultipartFile file) {
        String imageUrl = serviceImageStorageService.storeProfessionalImage(file, "services", getProfesionalId());
        return Map.of("imageUrl", imageUrl);
    }

    /**
     * Ejecuta la logica de upload profesional imagen manteniendola encapsulada en este componente.
     */
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

    /**
     * Endpoint PUT /services/{id}: Actualiza servicio manteniendo reglas de negocio y consistencia de datos.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @PutMapping("/services/{id}")
    public ProfesionalServiceResponse updateService(
        @PathVariable("id") String serviceId,
        @Valid @RequestBody ProfesionalServiceRequest request
    ) {
        return professionalPublicPageService.updateService(getProfesionalId(), serviceId, request);
    }

    /**
     * Endpoint DELETE /services/{id}: Elimina servicio y limpia relaciones o datos derivados cuando corresponde.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @DeleteMapping("/services/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteService(@PathVariable("id") String serviceId) {
        professionalPublicPageService.deleteService(getProfesionalId(), serviceId);
    }

    /**
     * Devuelve el listado de reservations aplicando permisos y filtros del caso de uso.
     */
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

    /**
     * Endpoint POST /reservas: Crea reserva validando datos de entrada y persistiendo el resultado.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
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

    /**
     * Endpoint PUT /reservas/{id}: Actualiza reserva manteniendo reglas de negocio y consistencia de datos.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
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

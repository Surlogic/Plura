package com.plura.plurabackend.professional.profile;

import com.plura.plurabackend.core.booking.dto.BookingCancelRequest;
import com.plura.plurabackend.core.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingCreateRequest;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingUpdateRequest;
import com.plura.plurabackend.core.booking.dto.BookingRescheduleRequest;
import com.plura.plurabackend.core.booking.dto.BookingPolicyResponse;
import com.plura.plurabackend.core.booking.dto.BookingPolicyUpdateRequest;
import com.plura.plurabackend.core.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.core.booking.dto.PublicBookingResponse;
import com.plura.plurabackend.professional.booking.BookingService;
import com.plura.plurabackend.professional.schedule.ScheduleService;
import com.plura.plurabackend.professional.dto.ProfesionalBusinessProfileUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * ProfessionalPublicPageService es un servicio de negocio del modulo profesionales / perfil.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: bookingService, scheduleService, professionalProfileService.
 * Foco funcional: profesionales, servicios, superficie publica.
 */
@Service
public class ProfessionalPublicPageService {

    private final BookingService bookingService;
    private final ScheduleService scheduleService;
    private final ProfessionalProfileService professionalProfileService;

    public ProfessionalPublicPageService(
        BookingService bookingService,
        ScheduleService scheduleService,
        ProfessionalProfileService professionalProfileService
    ) {
        this.bookingService = bookingService;
        this.scheduleService = scheduleService;
        this.professionalProfileService = professionalProfileService;
    }

    public ProfesionalPublicPageResponse getPublicPageBySlug(String slug) {
        return professionalProfileService.getPublicPageBySlug(slug);
    }

    public List<String> getAvailableSlots(String slug, String rawDate, String serviceId) {
        return scheduleService.getAvailableSlots(slug, rawDate, serviceId);
    }

    /**
     * Crea publico reserva validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public PublicBookingResponse createPublicBooking(String slug, PublicBookingRequest request, String rawUserId) {
        return bookingService.createPublicBooking(slug, request, rawUserId);
    }

    /**
     * Crea publico reserva validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public PublicBookingResponse createPublicBooking(
        String slug,
        PublicBookingRequest request,
        String rawUserId,
        String sourcePlatform
    ) {
        return bookingService.createPublicBooking(slug, request, rawUserId, sourcePlatform);
    }

    /**
     * Crea publico reserva validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public PublicBookingResponse createPublicBooking(
        String slug,
        PublicBookingRequest request,
        String rawUserId,
        String sourcePlatform,
        String analyticsSessionId
    ) {
        return bookingService.createPublicBooking(slug, request, rawUserId, sourcePlatform, analyticsSessionId);
    }

    public List<ProfessionalBookingResponse> getProfessionalBookings(
        String rawUserId,
        String rawDate,
        String rawDateFrom,
        String rawDateTo
    ) {
        return bookingService.getProfessionalBookings(rawUserId, rawDate, rawDateFrom, rawDateTo);
    }

    /**
     * Crea profesional reserva validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public ProfessionalBookingResponse createProfessionalBooking(
        String rawUserId,
        ProfessionalBookingCreateRequest request
    ) {
        return bookingService.createProfessionalBooking(rawUserId, request);
    }

    /**
     * Actualiza profesional reserva manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public ProfessionalBookingResponse updateProfessionalBooking(
        String rawUserId,
        Long bookingId,
        ProfessionalBookingUpdateRequest request
    ) {
        return bookingService.updateProfessionalBooking(rawUserId, bookingId, request);
    }

    /**
     * Cancela booking as professional respetando reglas de estado.
     */
    public BookingCommandResponse cancelBookingAsProfessional(
        String rawUserId,
        Long bookingId,
        BookingCancelRequest request,
        String idempotencyKey
    ) {
        return bookingService.cancelBookingAsProfessional(rawUserId, bookingId, request, idempotencyKey);
    }

    /**
     * Ejecuta la logica de reschedule reserva como profesional manteniendola encapsulada en este componente.
     */
    public BookingCommandResponse rescheduleBookingAsProfessional(
        String rawUserId,
        Long bookingId,
        BookingRescheduleRequest request,
        String idempotencyKey
    ) {
        return bookingService.rescheduleBookingAsProfessional(rawUserId, bookingId, request, idempotencyKey);
    }

    /**
     * Marca reserva no show y actualiza los indicadores relacionados.
     */
    public BookingCommandResponse markBookingNoShow(
        String rawUserId,
        Long bookingId,
        String idempotencyKey
    ) {
        return bookingService.markBookingNoShow(rawUserId, bookingId, idempotencyKey);
    }

    /**
     * Completa reserva y deja persistido el estado final del flujo.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public BookingCommandResponse completeBooking(
        String rawUserId,
        Long bookingId,
        String idempotencyKey
    ) {
        return bookingService.completeBooking(rawUserId, bookingId, idempotencyKey);
    }

    /**
     * Devuelve el listado de publico professionals aplicando permisos y filtros del caso de uso.
     */
    public List<ProfesionalPublicSummaryResponse> listPublicProfessionals(
        Integer limit,
        Integer page,
        Integer size,
        UUID categoryId,
        String categorySlug
    ) {
        return professionalProfileService.listPublicProfessionals(limit, page, size, categoryId, categorySlug);
    }

    public ProfesionalPublicPageResponse getPublicPageByProfesionalId(String rawUserId) {
        return professionalProfileService.getPublicPageByProfesionalId(rawUserId);
    }

    /**
     * Actualiza publico pagina manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public ProfesionalPublicPageResponse updatePublicPage(
        String rawUserId,
        ProfesionalPublicPageUpdateRequest request
    ) {
        return professionalProfileService.updatePublicPage(rawUserId, request);
    }

    /**
     * Actualiza business perfil manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public void updateBusinessProfile(String rawUserId, ProfesionalBusinessProfileUpdateRequest request) {
        professionalProfileService.updateBusinessProfile(rawUserId, request);
    }

    public ProfesionalScheduleDto getSchedule(String rawUserId) {
        return scheduleService.getSchedule(rawUserId);
    }

    /**
     * Actualiza agenda manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public ProfesionalScheduleDto updateSchedule(String rawUserId, ProfesionalScheduleDto request) {
        return scheduleService.updateSchedule(rawUserId, request);
    }

    public BookingPolicyResponse getBookingPolicy(String rawUserId) {
        return professionalProfileService.getBookingPolicy(rawUserId);
    }

    /**
     * Actualiza reserva politica manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public BookingPolicyResponse updateBookingPolicy(String rawUserId, BookingPolicyUpdateRequest request) {
        return professionalProfileService.updateBookingPolicy(rawUserId, request);
    }

    /**
     * Devuelve el listado de servicios aplicando permisos y filtros del caso de uso.
     */
    public List<ProfesionalServiceResponse> listServices(String rawUserId) {
        return professionalProfileService.listServices(rawUserId);
    }

    /**
     * Crea servicio validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public ProfesionalServiceResponse createService(String rawUserId, ProfesionalServiceRequest request) {
        return professionalProfileService.createService(rawUserId, request);
    }

    /**
     * Actualiza servicio manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public ProfesionalServiceResponse updateService(
        String rawUserId,
        String serviceId,
        ProfesionalServiceRequest request
    ) {
        return professionalProfileService.updateService(rawUserId, serviceId, request);
    }

    /**
     * Elimina servicio y limpia relaciones o datos derivados cuando corresponde.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public void deleteService(String rawUserId, String serviceId) {
        professionalProfileService.deleteService(rawUserId, serviceId);
    }
}

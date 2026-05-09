package com.plura.plurabackend.professional.profile;

import com.plura.plurabackend.core.booking.dto.BookingPolicyResponse;
import com.plura.plurabackend.core.booking.dto.BookingPolicyUpdateRequest;
import com.plura.plurabackend.professional.application.ProfileApplicationService;
import com.plura.plurabackend.professional.dto.ProfesionalBusinessProfileUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * ProfessionalProfileService es un servicio de negocio del modulo profesionales / perfil.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: profileApplicationService.
 * Foco funcional: profesionales, perfiles, servicios.
 */
@Service
public class ProfessionalProfileService {

    private final ProfileApplicationService profileApplicationService;

    public ProfessionalProfileService(ProfileApplicationService profileApplicationService) {
        this.profileApplicationService = profileApplicationService;
    }

    public ProfesionalPublicPageResponse getPublicPageBySlug(String slug) {
        return profileApplicationService.getPublicPageBySlug(slug);
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
        return profileApplicationService.listPublicProfessionals(limit, page, size, categoryId, categorySlug);
    }

    public ProfesionalPublicPageResponse getPublicPageByProfesionalId(String rawUserId) {
        return profileApplicationService.getPublicPageByProfesionalId(rawUserId);
    }

    /**
     * Actualiza publico pagina manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public ProfesionalPublicPageResponse updatePublicPage(String rawUserId, ProfesionalPublicPageUpdateRequest request) {
        return profileApplicationService.updatePublicPage(rawUserId, request);
    }

    /**
     * Actualiza business perfil manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public void updateBusinessProfile(String rawUserId, ProfesionalBusinessProfileUpdateRequest request) {
        profileApplicationService.updateBusinessProfile(rawUserId, request);
    }

    public BookingPolicyResponse getBookingPolicy(String rawUserId) {
        return profileApplicationService.getBookingPolicy(rawUserId);
    }

    /**
     * Actualiza reserva politica manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public BookingPolicyResponse updateBookingPolicy(String rawUserId, BookingPolicyUpdateRequest request) {
        return profileApplicationService.updateBookingPolicy(rawUserId, request);
    }

    /**
     * Devuelve el listado de servicios aplicando permisos y filtros del caso de uso.
     */
    public List<ProfesionalServiceResponse> listServices(String rawUserId) {
        return profileApplicationService.listServices(rawUserId);
    }

    /**
     * Crea servicio validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public ProfesionalServiceResponse createService(String rawUserId, ProfesionalServiceRequest request) {
        return profileApplicationService.createService(rawUserId, request);
    }

    /**
     * Actualiza servicio manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public ProfesionalServiceResponse updateService(String rawUserId, String serviceId, ProfesionalServiceRequest request) {
        return profileApplicationService.updateService(rawUserId, serviceId, request);
    }

    /**
     * Elimina servicio y limpia relaciones o datos derivados cuando corresponde.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public void deleteService(String rawUserId, String serviceId) {
        profileApplicationService.deleteService(rawUserId, serviceId);
    }
}

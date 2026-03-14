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

@Service
public class ProfessionalProfileService {

    private final ProfileApplicationService profileApplicationService;

    public ProfessionalProfileService(ProfileApplicationService profileApplicationService) {
        this.profileApplicationService = profileApplicationService;
    }

    public ProfesionalPublicPageResponse getPublicPageBySlug(String slug) {
        return profileApplicationService.getPublicPageBySlug(slug);
    }

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

    public ProfesionalPublicPageResponse updatePublicPage(String rawUserId, ProfesionalPublicPageUpdateRequest request) {
        return profileApplicationService.updatePublicPage(rawUserId, request);
    }

    public void updateBusinessProfile(String rawUserId, ProfesionalBusinessProfileUpdateRequest request) {
        profileApplicationService.updateBusinessProfile(rawUserId, request);
    }

    public BookingPolicyResponse getBookingPolicy(String rawUserId) {
        return profileApplicationService.getBookingPolicy(rawUserId);
    }

    public BookingPolicyResponse updateBookingPolicy(String rawUserId, BookingPolicyUpdateRequest request) {
        return profileApplicationService.updateBookingPolicy(rawUserId, request);
    }

    public List<ProfesionalServiceResponse> listServices(String rawUserId) {
        return profileApplicationService.listServices(rawUserId);
    }

    public ProfesionalServiceResponse createService(String rawUserId, ProfesionalServiceRequest request) {
        return profileApplicationService.createService(rawUserId, request);
    }

    public ProfesionalServiceResponse updateService(String rawUserId, String serviceId, ProfesionalServiceRequest request) {
        return profileApplicationService.updateService(rawUserId, serviceId, request);
    }

    public void deleteService(String rawUserId, String serviceId) {
        profileApplicationService.deleteService(rawUserId, serviceId);
    }
}

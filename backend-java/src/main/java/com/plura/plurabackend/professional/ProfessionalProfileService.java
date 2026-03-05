package com.plura.plurabackend.professional;

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

    private final ProfessionalPublicPageCoreService coreService;

    public ProfessionalProfileService(ProfessionalPublicPageCoreService coreService) {
        this.coreService = coreService;
    }

    public ProfesionalPublicPageResponse getPublicPageBySlug(String slug) {
        return coreService.getPublicPageBySlug(slug);
    }

    public List<ProfesionalPublicSummaryResponse> listPublicProfessionals(
        Integer limit,
        Integer page,
        Integer size,
        UUID categoryId,
        String categorySlug
    ) {
        return coreService.listPublicProfessionals(limit, page, size, categoryId, categorySlug);
    }

    public ProfesionalPublicPageResponse getPublicPageByProfesionalId(String rawUserId) {
        return coreService.getPublicPageByProfesionalId(rawUserId);
    }

    public ProfesionalPublicPageResponse updatePublicPage(String rawUserId, ProfesionalPublicPageUpdateRequest request) {
        return coreService.updatePublicPage(rawUserId, request);
    }

    public void updateBusinessProfile(String rawUserId, ProfesionalBusinessProfileUpdateRequest request) {
        coreService.updateBusinessProfile(rawUserId, request);
    }

    public List<ProfesionalServiceResponse> listServices(String rawUserId) {
        return coreService.listServices(rawUserId);
    }

    public ProfesionalServiceResponse createService(String rawUserId, ProfesionalServiceRequest request) {
        return coreService.createService(rawUserId, request);
    }

    public ProfesionalServiceResponse updateService(String rawUserId, String serviceId, ProfesionalServiceRequest request) {
        return coreService.updateService(rawUserId, serviceId, request);
    }

    public void deleteService(String rawUserId, String serviceId) {
        coreService.deleteService(rawUserId, serviceId);
    }
}

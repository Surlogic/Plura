package com.plura.plurabackend.professional.application;

import com.plura.plurabackend.core.storage.ImageCleanupService;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.category.model.Category;
import com.plura.plurabackend.core.category.repository.CategoryRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.plan.BooleanCapability;
import com.plura.plurabackend.professional.plan.LimitCapability;
import com.plura.plurabackend.professional.plan.PlanGuardService;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ProfileServiceCatalogSupport {

    private final ProfesionalServiceRepository profesionalServiceRepository;
    private final ProfilePublicPageAssembler profilePublicPageAssembler;
    private final ProfessionalSideEffectCoordinator sideEffectCoordinator;
    private final CategoryRepository categoryRepository;
    private final PlanGuardService planGuardService;
    private final ImageCleanupService imageCleanupService;

    public ProfileServiceCatalogSupport(
        ProfesionalServiceRepository profesionalServiceRepository,
        ProfilePublicPageAssembler profilePublicPageAssembler,
        ProfessionalSideEffectCoordinator sideEffectCoordinator,
        CategoryRepository categoryRepository,
        PlanGuardService planGuardService,
        ImageCleanupService imageCleanupService
    ) {
        this.profesionalServiceRepository = profesionalServiceRepository;
        this.profilePublicPageAssembler = profilePublicPageAssembler;
        this.sideEffectCoordinator = sideEffectCoordinator;
        this.categoryRepository = categoryRepository;
        this.planGuardService = planGuardService;
        this.imageCleanupService = imageCleanupService;
    }

    public List<ProfesionalServiceResponse> listServices(ProfessionalProfile profile) {
        return profesionalServiceRepository.findByProfessional_IdOrderByCreatedAtDesc(profile.getId())
            .stream()
            .map(profilePublicPageAssembler::toServiceResponse)
            .toList();
    }

    public ProfesionalServiceResponse createService(
        String rawUserId,
        ProfessionalProfile profile,
        ProfesionalServiceRequest request
    ) {
        long nextServiceCount = profesionalServiceRepository.countByProfessional_Id(profile.getId()) + 1;
        planGuardService.requireLimitNotExceeded(rawUserId, LimitCapability.MAX_SERVICES, nextServiceCount);

        ServicePaymentType paymentType = resolveServicePaymentType(request.getPaymentType());
        ensurePaymentTypeAllowed(rawUserId, paymentType);
        BigDecimal price = request.getPrice();
        BigDecimal depositAmount = resolveServiceDepositAmount(paymentType, request.getDepositAmount(), null, price);

        ProfesionalService service = new ProfesionalService();
        service.setProfessional(profile);
        service.setName(request.getName() == null ? null : request.getName().trim());
        service.setDescription(normalizeOptional(request.getDescription()));
        service.setPrice(price == null ? null : price.toPlainString());
        service.setDepositAmount(depositAmount);
        service.setDuration(request.getDuration() == null ? null : request.getDuration().trim());
        service.setCategory(resolveRequestedCategory(request.getCategorySlug()));
        service.setImageUrl(normalizeOptional(request.getImageUrl()));
        service.setPostBufferMinutes(sanitizePostBufferMinutes(request.getPostBufferMinutes()));
        service.setPaymentType(paymentType);
        service.setCurrency(resolveServiceCurrency(request.getCurrency()));
        service.setActive(request.getActive() == null ? true : request.getActive());

        ProfesionalService saved = profesionalServiceRepository.save(service);
        sideEffectCoordinator.onServiceCatalogChanged(profile, 30);
        return profilePublicPageAssembler.toServiceResponse(saved);
    }

    public ProfesionalServiceResponse updateService(
        String rawUserId,
        ProfessionalProfile profile,
        String serviceId,
        ProfesionalServiceRequest request
    ) {
        ProfesionalService service = profesionalServiceRepository.findById(serviceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado"));
        ensureOwnedBy(profile, service);

        ServicePaymentType nextPaymentType = request.getPaymentType() != null
            ? resolveServicePaymentType(request.getPaymentType())
            : resolveServicePaymentType(service.getPaymentType());
        ensurePaymentTypeAllowed(rawUserId, nextPaymentType);
        BigDecimal nextPrice = request.getPrice() != null ? request.getPrice() : parsePriceSnapshot(service.getPrice());
        BigDecimal nextDepositAmount = resolveServiceDepositAmount(
            nextPaymentType,
            request.getDepositAmount(),
            service.getDepositAmount(),
            nextPrice
        );

        if (request.getName() != null) {
            service.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            service.setDescription(normalizeOptional(request.getDescription()));
        }
        if (request.getPrice() != null) {
            service.setPrice(request.getPrice().toPlainString());
        }
        service.setDepositAmount(nextDepositAmount);
        if (request.getDuration() != null) {
            service.setDuration(request.getDuration().trim());
        }
        if (request.getCategorySlug() != null) {
            service.setCategory(resolveRequestedCategory(request.getCategorySlug()));
        }
        String oldImageUrl = service.getImageUrl();
        if (request.getImageUrl() != null) {
            service.setImageUrl(normalizeOptional(request.getImageUrl()));
        }
        if (request.getPostBufferMinutes() != null) {
            service.setPostBufferMinutes(sanitizePostBufferMinutes(request.getPostBufferMinutes()));
        }
        service.setPaymentType(nextPaymentType);
        if (request.getCurrency() != null) {
            service.setCurrency(resolveServiceCurrency(request.getCurrency()));
        }
        if (request.getActive() != null) {
            service.setActive(request.getActive());
        }

        ProfesionalService saved = profesionalServiceRepository.save(service);
        sideEffectCoordinator.onServiceCatalogChanged(profile, 30);

        if (request.getImageUrl() != null) {
            imageCleanupService.deleteIfChanged(oldImageUrl, saved.getImageUrl());
        }

        return profilePublicPageAssembler.toServiceResponse(saved);
    }

    public void deleteService(ProfessionalProfile profile, String serviceId) {
        ProfesionalService service = profesionalServiceRepository.findById(serviceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado"));
        ensureOwnedBy(profile, service);

        String imageUrl = service.getImageUrl();
        profesionalServiceRepository.delete(service);
        sideEffectCoordinator.onServiceCatalogChanged(profile, 30);

        imageCleanupService.deleteIfRemoved(imageUrl);
    }

    private void ensureOwnedBy(ProfessionalProfile profile, ProfesionalService service) {
        if (service.getProfessional() == null || !service.getProfessional().getId().equals(profile.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }
    }

    private int sanitizePostBufferMinutes(Integer value) {
        int normalized = value == null ? 0 : value;
        if (normalized < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El tiempo extra debe ser mayor o igual a 0");
        }
        return normalized;
    }

    private ServicePaymentType resolveServicePaymentType(ServicePaymentType paymentType) {
        return paymentType == null ? ServicePaymentType.ON_SITE : paymentType;
    }

    private void ensurePaymentTypeAllowed(String rawUserId, ServicePaymentType paymentType) {
        if (paymentType == null || paymentType == ServicePaymentType.ON_SITE) {
            return;
        }
        planGuardService.requireBooleanCapability(rawUserId, BooleanCapability.ONLINE_PAYMENTS);
    }

    private BigDecimal resolveServiceDepositAmount(
        ServicePaymentType paymentType,
        BigDecimal requestedDepositAmount,
        BigDecimal existingDepositAmount,
        BigDecimal price
    ) {
        if (paymentType != ServicePaymentType.DEPOSIT) {
            return null;
        }
        BigDecimal resolvedDepositAmount = requestedDepositAmount != null ? requestedDepositAmount : existingDepositAmount;
        if (resolvedDepositAmount == null || resolvedDepositAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "La seña debe ser mayor a 0 cuando el servicio requiere seña"
            );
        }
        if (price != null && resolvedDepositAmount.compareTo(price) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La seña no puede superar el precio del servicio");
        }
        return resolvedDepositAmount;
    }

    private String resolveServiceCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return "UYU";
        }
        return currency.trim().toUpperCase(Locale.ROOT);
    }

    private BigDecimal parsePriceSnapshot(String price) {
        if (price == null || price.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(price.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private Category resolveRequestedCategory(String rawSlug) {
        String slug = normalizeOptional(rawSlug);
        if (slug == null) {
            return null;
        }
        return categoryRepository.findBySlugIgnoreCaseAndActiveTrue(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Categoría de servicio inválida"));
    }
}

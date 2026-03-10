package com.plura.plurabackend.professional.application;

import com.plura.plurabackend.cache.ProfileCacheService;
import com.plura.plurabackend.booking.dto.BookingPolicyResponse;
import com.plura.plurabackend.booking.dto.BookingPolicyUpdateRequest;
import com.plura.plurabackend.category.model.Category;
import com.plura.plurabackend.professional.ProfessionalCategorySupport;
import com.plura.plurabackend.professional.dto.ProfesionalBusinessProfileUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.photo.model.BusinessPhoto;
import com.plura.plurabackend.professional.photo.model.BusinessPhotoType;
import com.plura.plurabackend.professional.photo.repository.BusinessPhotoRepository;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import com.plura.plurabackend.productplan.EffectiveProductPlan;
import com.plura.plurabackend.productplan.EffectiveProductPlanService;
import com.plura.plurabackend.storage.thumbnail.ImageThumbnailJobService;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfileApplicationService {

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final BusinessPhotoRepository businessPhotoRepository;
    private final ProfessionalCategorySupport categorySupport;
    private final UserRepository userRepository;
    private final EffectiveProductPlanService effectiveProductPlanService;
    private final ImageThumbnailJobService imageThumbnailJobService;
    private final ProfileCacheService profileCacheService;
    private final ProfessionalAccessSupport professionalAccessSupport;
    private final ProfessionalSideEffectCoordinator sideEffectCoordinator;
    private final ProfilePublicPageAssembler profilePublicPageAssembler;
    private final ProfileBookingPolicySupport profileBookingPolicySupport;
    private final ProfileServiceCatalogSupport profileServiceCatalogSupport;
    private final ProfileGeocodingSupport profileGeocodingSupport;

    public ProfileApplicationService(
        ProfessionalProfileRepository professionalProfileRepository,
        BusinessPhotoRepository businessPhotoRepository,
        ProfessionalCategorySupport categorySupport,
        UserRepository userRepository,
        EffectiveProductPlanService effectiveProductPlanService,
        ImageThumbnailJobService imageThumbnailJobService,
        ProfileCacheService profileCacheService,
        ProfessionalAccessSupport professionalAccessSupport,
        ProfessionalSideEffectCoordinator sideEffectCoordinator,
        ProfilePublicPageAssembler profilePublicPageAssembler,
        ProfileBookingPolicySupport profileBookingPolicySupport,
        ProfileServiceCatalogSupport profileServiceCatalogSupport,
        ProfileGeocodingSupport profileGeocodingSupport
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.businessPhotoRepository = businessPhotoRepository;
        this.categorySupport = categorySupport;
        this.userRepository = userRepository;
        this.effectiveProductPlanService = effectiveProductPlanService;
        this.imageThumbnailJobService = imageThumbnailJobService;
        this.profileCacheService = profileCacheService;
        this.professionalAccessSupport = professionalAccessSupport;
        this.sideEffectCoordinator = sideEffectCoordinator;
        this.profilePublicPageAssembler = profilePublicPageAssembler;
        this.profileBookingPolicySupport = profileBookingPolicySupport;
        this.profileServiceCatalogSupport = profileServiceCatalogSupport;
        this.profileGeocodingSupport = profileGeocodingSupport;
    }

    public ProfesionalPublicPageResponse getPublicPageBySlug(String slug) {
        var profileCached = profileCacheService.getPublicPageBySlug(slug);
        if (profileCached.isPresent()) {
            ProfesionalPublicPageResponse cachedResponse = profileCached.get();
            if (cachedResponse.getName() != null && !cachedResponse.getName().isBlank()) {
                return cachedResponse;
            }
            profileCacheService.evictPublicPageBySlug(slug);
        }
        ProfessionalProfile profile = professionalProfileRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
        professionalAccessSupport.ensurePublicProfessionalIsActive(profile);
        profile = profileGeocodingSupport.ensurePublicCoordinates(profile);
        ProfesionalPublicPageResponse response = profilePublicPageAssembler.toPublicPage(profile);
        profileCacheService.putPublicPageBySlug(slug, response);
        return response;
    }

    public List<ProfesionalPublicSummaryResponse> listPublicProfessionals(
        Integer limit,
        Integer page,
        Integer size,
        UUID categoryId,
        String categorySlug
    ) {
        String normalizedCategorySlug = categorySlug == null ? null : categorySlug.trim().toLowerCase(Locale.ROOT);
        String cacheKey = buildPublicSummaryCacheKey(limit, page, size, categoryId, normalizedCategorySlug);
        var cached = profileCacheService.getPublicSummaries(cacheKey);
        if (cached.isPresent()) {
            return cached.get();
        }

        int requestedPage = page == null ? 0 : Math.max(0, page);
        int requestedSize = size == null ? 60 : Math.max(1, Math.min(size, 200));
        int effectiveLimit = (limit != null && limit > 0) ? Math.min(limit, 200) : requestedSize;
        int pageSize = Math.min(requestedSize, effectiveLimit);
        int currentPage = requestedPage;
        List<ProfessionalProfile> profiles = new ArrayList<>();

        while (profiles.size() < effectiveLimit && page == null && size == null) {
            Page<Long> idsPage = professionalProfileRepository.findActiveIdsForPublicListing(
                categoryId,
                normalizedCategorySlug,
                PageRequest.of(currentPage, pageSize)
            );
            if (idsPage.isEmpty()) {
                break;
            }
            var fetchedProfiles = professionalProfileRepository.findByIdInAndActiveTrueWithRelations(idsPage.getContent());
            Map<Long, ProfessionalProfile> byId = fetchedProfiles.stream()
                .collect(Collectors.toMap(ProfessionalProfile::getId, profile -> profile));
            for (Long id : idsPage.getContent()) {
                ProfessionalProfile profile = byId.get(id);
                if (profile != null) {
                    profiles.add(profile);
                }
                if (profiles.size() >= effectiveLimit) {
                    break;
                }
            }
            if (!idsPage.hasNext()) {
                break;
            }
            currentPage++;
        }

        if (page != null || size != null) {
            Page<Long> idsPage = professionalProfileRepository.findActiveIdsForPublicListing(
                categoryId,
                normalizedCategorySlug,
                PageRequest.of(requestedPage, pageSize)
            );
            var fetchedProfiles = professionalProfileRepository.findByIdInAndActiveTrueWithRelations(idsPage.getContent());
            Map<Long, ProfessionalProfile> byId = fetchedProfiles.stream()
                .collect(Collectors.toMap(ProfessionalProfile::getId, profile -> profile));
            for (Long id : idsPage.getContent()) {
                ProfessionalProfile profile = byId.get(id);
                if (profile != null) {
                    profiles.add(profile);
                }
            }
        }

        List<ProfessionalProfile> toUpdate = new ArrayList<>();
        profiles.forEach(profile -> {
            if (profile.getSlug() == null || profile.getSlug().isBlank()) {
                professionalAccessSupport.ensureSlug(profile);
                toUpdate.add(profile);
            }
        });
        if (!toUpdate.isEmpty()) {
            professionalProfileRepository.saveAll(toUpdate);
        }

        List<ProfesionalPublicSummaryResponse> response = profiles.stream()
            .map(profilePublicPageAssembler::toSummary)
            .toList();
        profileCacheService.putPublicSummaries(cacheKey, response);
        return response;
    }

    public ProfesionalPublicPageResponse getPublicPageByProfesionalId(String rawUserId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        professionalAccessSupport.ensureSlug(profile);
        profile = profileGeocodingSupport.ensurePublicCoordinates(profile);
        return profilePublicPageAssembler.toPublicPage(profile);
    }

    @Transactional
    public ProfesionalPublicPageResponse updatePublicPage(
        String rawUserId,
        ProfesionalPublicPageUpdateRequest request
    ) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        EffectiveProductPlan effectivePlan = effectiveProductPlanService.resolveForProfessional(profile);

        if (request.getHeadline() != null) {
            profile.setPublicHeadline(request.getHeadline().trim());
        }
        if (request.getAbout() != null) {
            profile.setPublicAbout(request.getAbout().trim());
        }
        if (request.getPhotos() != null) {
            List<String> cleaned = request.getPhotos().stream()
                .map(photo -> photo == null ? "" : photo.trim())
                .filter(photo -> !photo.isBlank())
                .toList();
            int maxBusinessPhotos = effectivePlan.capabilities().maxBusinessPhotos();
            if (cleaned.size() > maxBusinessPhotos) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tu plan permite hasta " + maxBusinessPhotos + " fotos del negocio"
                );
            }
            profile.getPublicPhotos().clear();
            profile.getPublicPhotos().addAll(cleaned);
            syncLocalBusinessPhotos(profile, cleaned);
            cleaned.stream()
                .map(this::extractStorageObjectKey)
                .forEach(imageThumbnailJobService::generateThumbnailsAsync);
        }

        professionalAccessSupport.ensureSlug(profile);
        profile = professionalProfileRepository.save(profile);
        sideEffectCoordinator.onProfileChanged(profile);
        return profilePublicPageAssembler.toPublicPage(profile);
    }

    @Transactional
    public void updateBusinessProfile(String rawUserId, ProfesionalBusinessProfileUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload inválido");
        }
        Double requestedLatitude = profileGeocodingSupport.normalizeLatitude(request.getLatitude());
        Double requestedLongitude = profileGeocodingSupport.normalizeLongitude(request.getLongitude());
        profileGeocodingSupport.validateCoordinatesPair(requestedLatitude, requestedLongitude);

        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        User user = profile.getUser();

        if (request.getFullName() != null) {
            String fullName = request.getFullName().trim();
            if (fullName.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre no puede estar vacío");
            }
            user.setFullName(fullName);
            profile.setDisplayName(fullName);
        }
        if (request.getPhoneNumber() != null) {
            String phone = request.getPhoneNumber().trim();
            if (phone.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El teléfono no puede estar vacío");
            }
            if (user.getPhoneNumber() == null || !user.getPhoneNumber().trim().equals(phone)) {
                user.setPhoneVerifiedAt(null);
            }
            user.setPhoneNumber(phone);
        }

        if (request.getCategorySlugs() != null) {
            Set<Category> categories = categorySupport.resolveCategoriesBySlugs(request.getCategorySlugs());
            categorySupport.applyCategories(profile, categories);
        } else if (request.getRubro() != null) {
            String rubro = request.getRubro().trim();
            if (rubro.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rubro no puede estar vacío");
            }
            String mappedSlug = com.plura.plurabackend.common.util.SlugUtils.toSlug(rubro);
            Category category = categorySupport.resolveCategoriesBySlugs(List.of(mappedSlug)).stream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rubro inválido"));
            categorySupport.applyCategories(profile, Set.of(category));
        }

        String nextCountry = profile.getCountry();
        String nextCity = profile.getCity();
        String nextFullAddress = profile.getFullAddress();
        Double nextLatitude = profile.getLatitude();
        Double nextLongitude = profile.getLongitude();

        if (request.getCountry() != null) {
            nextCountry = profileGeocodingSupport.normalizeLocationPart(request.getCountry());
        }
        if (request.getCity() != null) {
            nextCity = profileGeocodingSupport.normalizeLocationPart(request.getCity());
        }
        if (request.getFullAddress() != null) {
            nextFullAddress = profileGeocodingSupport.normalizeLocationPart(request.getFullAddress());
        }
        if (request.getLocation() != null && !profileGeocodingSupport.hasAnyStructuredLocationInput(request)) {
            String location = request.getLocation().trim();
            if (location.isBlank()) {
                nextCountry = null;
                nextCity = null;
                nextFullAddress = null;
            } else {
                nextFullAddress = location;
            }
        }

        if (nextCountry == null && nextCity == null && nextFullAddress == null) {
            profile.setCountry(null);
            profile.setCity(null);
            profile.setFullAddress(null);
            profile.setLocation(null);
            profile.setLocationText(null);
            profile.setLatitude(null);
            profile.setLongitude(null);
        } else {
            if (nextCountry == null || nextCity == null || nextFullAddress == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "country, city y fullAddress deben enviarse juntos"
                );
            }
            String composedLocation = profileGeocodingSupport.composeLocation(nextFullAddress, nextCity, nextCountry);
            profile.setCountry(nextCountry);
            profile.setCity(nextCity);
            profile.setFullAddress(nextFullAddress);
            profile.setLocation(composedLocation);
            profile.setLocationText(composedLocation);
            if (request.getLatitude() != null || request.getLongitude() != null) {
                nextLatitude = requestedLatitude;
                nextLongitude = requestedLongitude;
            }
            profile.setLatitude(nextLatitude);
            profile.setLongitude(nextLongitude);
        }

        if (request.getLogoUrl() != null) {
            String logoUrl = request.getLogoUrl().trim();
            profile.setLogoUrl(logoUrl.isBlank() ? null : logoUrl);
            if (!logoUrl.isBlank()) {
                imageThumbnailJobService.generateThumbnailsAsync(extractStorageObjectKey(logoUrl));
            }
        }
        if (request.getInstagram() != null) {
            profile.setInstagram(normalizeOptional(request.getInstagram()));
        }
        if (request.getFacebook() != null) {
            profile.setFacebook(normalizeOptional(request.getFacebook()));
        }
        if (request.getTiktok() != null) {
            profile.setTiktok(normalizeOptional(request.getTiktok()));
        }
        if (request.getWebsite() != null) {
            profile.setWebsite(normalizeOptional(request.getWebsite()));
        }
        if (request.getWhatsapp() != null) {
            profile.setWhatsapp(normalizeOptional(request.getWhatsapp()));
        }

        userRepository.save(user);
        profile = professionalProfileRepository.save(profile);
        professionalProfileRepository.updateCoordinates(profile.getId(), profile.getLatitude(), profile.getLongitude());
        sideEffectCoordinator.onProfileChanged(profile);
    }

    public BookingPolicyResponse getBookingPolicy(String rawUserId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        return profileBookingPolicySupport.getPolicy(profile);
    }

    @Transactional
    public BookingPolicyResponse updateBookingPolicy(String rawUserId, BookingPolicyUpdateRequest request) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        return profileBookingPolicySupport.updatePolicy(profile, request);
    }

    public List<ProfesionalServiceResponse> listServices(String rawUserId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        return profileServiceCatalogSupport.listServices(profile);
    }

    @Transactional
    public ProfesionalServiceResponse createService(String rawUserId, ProfesionalServiceRequest request) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        return profileServiceCatalogSupport.createService(profile, request);
    }

    @Transactional
    public ProfesionalServiceResponse updateService(
        String rawUserId,
        String serviceId,
        ProfesionalServiceRequest request
    ) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        return profileServiceCatalogSupport.updateService(profile, serviceId, request);
    }

    @Transactional
    public void deleteService(String rawUserId, String serviceId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        profileServiceCatalogSupport.deleteService(profile, serviceId);
    }

    private void syncLocalBusinessPhotos(ProfessionalProfile profile, List<String> cleanedPhotoUrls) {
        businessPhotoRepository.deleteByProfessional_IdAndType(profile.getId(), BusinessPhotoType.LOCAL);
        if (cleanedPhotoUrls.isEmpty()) {
            return;
        }
        List<BusinessPhoto> localPhotos = cleanedPhotoUrls.stream()
            .map(url -> {
                BusinessPhoto photo = new BusinessPhoto();
                photo.setProfessional(profile);
                photo.setUrl(url);
                photo.setType(BusinessPhotoType.LOCAL);
                return photo;
            })
            .toList();
        businessPhotoRepository.saveAll(localPhotos);
    }

    private String extractStorageObjectKey(String urlOrKey) {
        if (urlOrKey == null || urlOrKey.isBlank()) {
            return "";
        }
        String value = urlOrKey.trim();
        if (value.startsWith("r2://")) {
            String withoutScheme = value.substring("r2://".length()).replaceFirst("^/+", "");
            int slash = withoutScheme.indexOf('/');
            return slash >= 0 ? withoutScheme.substring(slash + 1) : withoutScheme;
        }
        if (value.startsWith("r2:")) {
            return value.substring("r2:".length()).replaceFirst("^/+", "");
        }
        int queryIndex = value.indexOf('?');
        if (queryIndex >= 0) {
            value = value.substring(0, queryIndex);
        }
        int pathStart = value.indexOf('/', value.indexOf("://") + 3);
        if (pathStart >= 0 && value.startsWith("http")) {
            return value.substring(pathStart + 1);
        }
        int slash = value.lastIndexOf('/');
        if (slash >= 0 && slash + 1 < value.length()) {
            return value.substring(slash + 1);
        }
        return value;
    }

    private String buildPublicSummaryCacheKey(
        Integer limit,
        Integer page,
        Integer size,
        UUID categoryId,
        String categorySlug
    ) {
        return "limit=" + (limit == null ? "" : limit)
            + "|page=" + (page == null ? "" : page)
            + "|size=" + (size == null ? "" : size)
            + "|categoryId=" + (categoryId == null ? "" : categoryId)
            + "|categorySlug=" + (categorySlug == null ? "" : categorySlug);
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }
}

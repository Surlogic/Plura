package com.plura.plurabackend.profesional;

import com.plura.plurabackend.profesional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.profesional.dto.ProfesionalPublicPageUpdateRequest;
import com.plura.plurabackend.profesional.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.profesional.dto.ProfesionalServiceResponse;
import com.plura.plurabackend.profesional.model.ProfesionalService;
import com.plura.plurabackend.profesional.repository.ProfesionalServiceRepository;
import com.plura.plurabackend.users.model.UserProfesional;
import com.plura.plurabackend.users.repository.UserProfesionalRepository;
import com.plura.plurabackend.util.SlugUtils;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfesionalPublicPageService {

    private final UserProfesionalRepository userProfesionalRepository;
    private final ProfesionalServiceRepository profesionalServiceRepository;

    public ProfesionalPublicPageService(
        UserProfesionalRepository userProfesionalRepository,
        ProfesionalServiceRepository profesionalServiceRepository
    ) {
        this.userProfesionalRepository = userProfesionalRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
    }

    public ProfesionalPublicPageResponse getPublicPageBySlug(String slug) {
        UserProfesional user = userProfesionalRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
        return mapToPublicPage(user);
    }

    public ProfesionalPublicPageResponse getPublicPageByProfesionalId(String profesionalId) {
        UserProfesional user = userProfesionalRepository.findById(profesionalId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
        ensureSlug(user);
        return mapToPublicPage(user);
    }

    public ProfesionalPublicPageResponse updatePublicPage(
        String profesionalId,
        ProfesionalPublicPageUpdateRequest request
    ) {
        UserProfesional user = userProfesionalRepository.findById(profesionalId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));

        if (request.getHeadline() != null) {
            user.setPublicHeadline(request.getHeadline().trim());
        }
        if (request.getAbout() != null) {
            user.setPublicAbout(request.getAbout().trim());
        }
        if (request.getPhotos() != null) {
            List<String> cleaned = request.getPhotos().stream()
                .map(photo -> photo == null ? "" : photo.trim())
                .filter(photo -> !photo.isBlank())
                .toList();
            user.setPublicPhotos(cleaned);
        }

        ensureSlug(user);
        user = userProfesionalRepository.save(user);

        return mapToPublicPage(user);
    }

    public List<ProfesionalServiceResponse> listServices(String profesionalId) {
        return profesionalServiceRepository.findByProfesional_IdOrderByCreatedAtDesc(profesionalId)
            .stream()
            .map(this::mapService)
            .toList();
    }

    public ProfesionalServiceResponse createService(String profesionalId, ProfesionalServiceRequest request) {
        UserProfesional user = userProfesionalRepository.findById(profesionalId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));

        ProfesionalService service = new ProfesionalService();
        service.setProfesional(user);
        service.setName(request.getName());
        service.setPrice(request.getPrice());
        service.setDuration(request.getDuration());

        ProfesionalService saved = profesionalServiceRepository.save(service);
        return mapService(saved);
    }

    public ProfesionalServiceResponse updateService(
        String profesionalId,
        String serviceId,
        ProfesionalServiceRequest request
    ) {
        ProfesionalService service = profesionalServiceRepository.findById(serviceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado"));

        if (!service.getProfesional().getId().equals(profesionalId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }

        if (request.getName() != null) {
            service.setName(request.getName());
        }
        if (request.getPrice() != null) {
            service.setPrice(request.getPrice());
        }
        if (request.getDuration() != null) {
            service.setDuration(request.getDuration());
        }

        ProfesionalService saved = profesionalServiceRepository.save(service);
        return mapService(saved);
    }

    public void deleteService(String profesionalId, String serviceId) {
        ProfesionalService service = profesionalServiceRepository.findById(serviceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado"));

        if (!service.getProfesional().getId().equals(profesionalId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }

        profesionalServiceRepository.delete(service);
    }

    private ProfesionalPublicPageResponse mapToPublicPage(UserProfesional user) {
        List<ProfesionalServiceResponse> services = profesionalServiceRepository
            .findByProfesional_IdOrderByCreatedAtDesc(user.getId())
            .stream()
            .map(this::mapService)
            .collect(Collectors.toList());

        return new ProfesionalPublicPageResponse(
            user.getId(),
            user.getSlug(),
            user.getFullName(),
            user.getRubro(),
            user.getPublicHeadline(),
            user.getPublicAbout(),
            user.getLocation(),
            user.getEmail(),
            user.getPhoneNumber(),
            user.getPublicPhotos(),
            services
        );
    }

    private ProfesionalServiceResponse mapService(ProfesionalService service) {
        return new ProfesionalServiceResponse(
            service.getId(),
            service.getName(),
            service.getPrice(),
            service.getDuration()
        );
    }

    private void ensureSlug(UserProfesional user) {
        if (user.getSlug() != null && !user.getSlug().isBlank()) {
            return;
        }
        String slug = SlugUtils.generateUniqueSlug(user.getFullName(), userProfesionalRepository::existsBySlug);
        user.setSlug(slug);
    }
}

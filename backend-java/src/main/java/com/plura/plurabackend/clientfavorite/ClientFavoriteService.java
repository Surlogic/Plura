package com.plura.plurabackend.clientfavorite;

import com.plura.plurabackend.clientfavorite.model.ClientFavoriteProfessional;
import com.plura.plurabackend.clientfavorite.repository.ClientFavoriteProfessionalRepository;
import com.plura.plurabackend.professional.ProfessionalCategorySupport;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ClientFavoriteService {

    private final ClientFavoriteProfessionalRepository favoriteRepository;
    private final UserRepository userRepository;
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfessionalCategorySupport categorySupport;

    public ClientFavoriteService(
        ClientFavoriteProfessionalRepository favoriteRepository,
        UserRepository userRepository,
        ProfessionalProfileRepository professionalProfileRepository,
        ProfessionalCategorySupport categorySupport
    ) {
        this.favoriteRepository = favoriteRepository;
        this.userRepository = userRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.categorySupport = categorySupport;
    }

    @Transactional(readOnly = true)
    public List<ProfesionalPublicSummaryResponse> listFavorites(String rawUserId) {
        User user = resolveClientUser(rawUserId);
        return favoriteRepository.findByClientUser_IdOrderByCreatedAtDesc(user.getId())
            .stream()
            .map(ClientFavoriteProfessional::getProfessional)
            .filter(this::isProfessionalActive)
            .map(this::mapToSummary)
            .toList();
    }

    @Transactional
    public ProfesionalPublicSummaryResponse addFavorite(String rawUserId, String rawSlug) {
        User user = resolveClientUser(rawUserId);
        ProfessionalProfile profile = resolveActiveProfessional(rawSlug);

        favoriteRepository.findByClientUser_IdAndProfessional_Id(user.getId(), profile.getId())
            .orElseGet(() -> favoriteRepository.save(new ClientFavoriteProfessional(
                null,
                user,
                profile,
                null
            )));

        return mapToSummary(profile);
    }

    @Transactional
    public void removeFavorite(String rawUserId, String rawSlug) {
        User user = resolveClientUser(rawUserId);
        String slug = normalizeSlug(rawSlug);
        if (slug.isBlank()) {
            return;
        }

        professionalProfileRepository.findBySlug(slug).ifPresent(profile ->
            favoriteRepository.deleteByClientUser_IdAndProfessional_Id(user.getId(), profile.getId())
        );
    }

    private ProfesionalPublicSummaryResponse mapToSummary(ProfessionalProfile profile) {
        return new ProfesionalPublicSummaryResponse(
            String.valueOf(profile.getId()),
            profile.getSlug(),
            profile.getUser().getFullName(),
            categorySupport.resolvePrimaryRubro(profile),
            profile.getLocation(),
            profile.getPublicHeadline(),
            categorySupport.mapCategories(profile.getCategories()),
            profile.getLogoUrl()
        );
    }

    private ProfessionalProfile resolveActiveProfessional(String rawSlug) {
        String slug = normalizeSlug(rawSlug);
        if (slug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profesional inválido");
        }

        ProfessionalProfile profile = professionalProfileRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));

        if (!isProfessionalActive(profile)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado");
        }

        return profile;
    }

    private boolean isProfessionalActive(ProfessionalProfile profile) {
        return profile != null && !Boolean.FALSE.equals(profile.getActive());
    }

    private User resolveClientUser(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }

        return user;
    }

    private Long parseUserId(String rawUserId) {
        if (rawUserId == null || rawUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }
        try {
            return Long.parseLong(rawUserId.trim());
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalido");
        }
    }

    private String normalizeSlug(String rawSlug) {
        if (rawSlug == null) return "";
        return rawSlug.trim().toLowerCase(Locale.ROOT);
    }
}

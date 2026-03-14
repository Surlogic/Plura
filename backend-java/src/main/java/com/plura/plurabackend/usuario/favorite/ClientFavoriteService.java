package com.plura.plurabackend.usuario.favorite;

import com.plura.plurabackend.core.professional.ProfessionalPublicReadFacade;
import com.plura.plurabackend.core.professional.ProfessionalPublicSummary;
import com.plura.plurabackend.usuario.favorite.repository.ClientFavoriteProfessionalRepository;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ClientFavoriteService {

    private final ClientFavoriteProfessionalRepository favoriteRepository;
    private final UserRepository userRepository;
    private final ProfessionalPublicReadFacade professionalPublicReadFacade;

    public ClientFavoriteService(
        ClientFavoriteProfessionalRepository favoriteRepository,
        UserRepository userRepository,
        ProfessionalPublicReadFacade professionalPublicReadFacade
    ) {
        this.favoriteRepository = favoriteRepository;
        this.userRepository = userRepository;
        this.professionalPublicReadFacade = professionalPublicReadFacade;
    }

    @Transactional(readOnly = true)
    public List<ProfesionalPublicSummaryResponse> listFavorites(String rawUserId) {
        User user = resolveClientUser(rawUserId);
        List<Long> professionalIds = favoriteRepository.findProfessionalIdsByClientUser_IdOrderByCreatedAtDesc(user.getId());
        var summariesById = professionalPublicReadFacade.findActiveSummariesByIds(professionalIds);
        return professionalIds.stream()
            .map(summariesById::get)
            .filter(Objects::nonNull)
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public ProfesionalPublicSummaryResponse addFavorite(String rawUserId, String rawSlug) {
        User user = resolveClientUser(rawUserId);
        ProfessionalPublicSummary summary = professionalPublicReadFacade.findActiveSummaryBySlug(rawSlug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));

        favoriteRepository.findByClientUser_IdAndProfessional_Id(user.getId(), summary.professionalId())
            .orElseGet(() -> favoriteRepository.saveReference(user, summary.professionalId()));

        return toResponse(summary);
    }

    @Transactional
    public void removeFavorite(String rawUserId, String rawSlug) {
        User user = resolveClientUser(rawUserId);
        String slug = normalizeSlug(rawSlug);
        if (slug.isBlank()) {
            return;
        }

        professionalPublicReadFacade.findActiveProfessionalIdBySlug(slug).ifPresent(professionalId ->
            favoriteRepository.deleteByClientUser_IdAndProfessional_Id(user.getId(), professionalId)
        );
    }

    private ProfesionalPublicSummaryResponse toResponse(ProfessionalPublicSummary summary) {
        return new ProfesionalPublicSummaryResponse(
            String.valueOf(summary.professionalId()),
            summary.slug(),
            summary.fullName(),
            summary.rubro(),
            summary.location(),
            summary.publicHeadline(),
            summary.categories(),
            summary.logoUrl()
        );
    }

    private User resolveClientUser(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        ensureClientUser(user);
        return user;
    }

    private void ensureClientUser(User user) {
        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
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

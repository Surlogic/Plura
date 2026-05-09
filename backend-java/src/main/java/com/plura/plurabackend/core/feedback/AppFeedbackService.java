package com.plura.plurabackend.core.feedback;

import com.plura.plurabackend.core.feedback.dto.AppFeedbackResponse;
import com.plura.plurabackend.core.feedback.dto.CreateAppFeedbackRequest;
import com.plura.plurabackend.core.feedback.model.AppFeedback;
import com.plura.plurabackend.core.feedback.model.AuthorRole;
import com.plura.plurabackend.core.feedback.model.FeedbackCategory;
import com.plura.plurabackend.core.feedback.repository.AppFeedbackRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * AppFeedbackService es un servicio de negocio del modulo feedback.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: appFeedbackRepository, userRepository.
 * Foco funcional: feedback, servicios.
 */
@Service
public class AppFeedbackService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AppFeedbackService.class);

    private final AppFeedbackRepository appFeedbackRepository;
    private final UserRepository userRepository;

    public AppFeedbackService(AppFeedbackRepository appFeedbackRepository, UserRepository userRepository) {
        this.appFeedbackRepository = appFeedbackRepository;
        this.userRepository = userRepository;
    }

    /**
     * Crea create validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Transactional
    public AppFeedbackResponse create(Long userId, AuthorRole authorRole, CreateAppFeedbackRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        AppFeedback feedback = new AppFeedback();
        feedback.setAuthor(user);
        feedback.setAuthorRole(authorRole);
        feedback.setRating(request.getRating());

        String text = normalizeText(request.getText());
        feedback.setText(text);

        String contextSource = normalizeNullable(request.getContextSource());
        feedback.setContextSource(contextSource);

        if (request.getCategory() != null && !request.getCategory().isBlank()) {
            try {
                feedback.setCategory(FeedbackCategory.valueOf(request.getCategory().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Categoria invalida: " + request.getCategory());
            }
        }

        feedback.setPublicVisible(text != null);

        feedback = appFeedbackRepository.save(feedback);
        LOGGER.info("App feedback created: id={} role={} rating={} publicVisible={}",
            feedback.getId(), authorRole, request.getRating(), feedback.getPublicVisible());

        return toResponse(feedback);
    }

    /**
     * Devuelve el listado de mine aplicando permisos y filtros del caso de uso.
     */
    @Transactional(readOnly = true)
    public Page<AppFeedbackResponse> listMine(Long userId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        Page<AppFeedback> feedbackPage = appFeedbackRepository.findByAuthorIdOrderByCreatedAtDescIdDesc(
            userId,
            PageRequest.of(Math.max(page, 0), safeSize)
        );
        return feedbackPage.map(this::toResponse);
    }

    /**
     * Elimina mine y limpia relaciones o datos derivados cuando corresponde.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Transactional
    public void deleteMine(Long feedbackId, Long userId) {
        AppFeedback feedback = appFeedbackRepository.findById(feedbackId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback no encontrado"));

        if (feedback.getAuthor() == null || !userId.equals(feedback.getAuthor().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }

        appFeedbackRepository.delete(feedback);
        appFeedbackRepository.flush();

        LOGGER.info("App feedback deleted by author: id={} userId={}", feedbackId, userId);
    }

    /**
     * Devuelve el listado de publico aplicando permisos y filtros del caso de uso.
     */
    @Transactional(readOnly = true)
    public List<AppFeedbackResponse> listPublic(int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 20);
        return appFeedbackRepository.findPublicVisible(PageRequest.of(0, safeLimit))
            .getContent()
            .stream()
            .map(this::toResponse)
            .toList();
    }

    /**
     * Convierte datos internos al formato respuesta esperado por el consumidor.
     */
    private AppFeedbackResponse toResponse(AppFeedback feedback) {
        return new AppFeedbackResponse(
            feedback.getId(),
            feedback.getRating(),
            feedback.getText(),
            feedback.getCategory() != null ? feedback.getCategory().name() : null,
            feedback.getContextSource(),
            feedback.getCreatedAt().toString(),
            feedback.getAuthorRole() != null ? feedback.getAuthorRole().name() : null,
            buildPublicAuthorDisplayName(feedback.getAuthor() != null ? feedback.getAuthor().getFullName() : null),
            Boolean.TRUE.equals(feedback.getPublicVisible())
        );
    }

    /**
     * Construye publico author display name a partir de datos internos ya validados.
     */
    private String buildPublicAuthorDisplayName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return null;
        }

        String[] parts = fullName.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0];
        }

        String firstName = parts[0];
        String lastInitial = parts[parts.length - 1].substring(0, 1).toUpperCase();
        return firstName + " " + lastInitial + ".";
    }

    /**
     * Normaliza text para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeText(String text) {
        if (text == null) {
            return null;
        }
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Normaliza nullable para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

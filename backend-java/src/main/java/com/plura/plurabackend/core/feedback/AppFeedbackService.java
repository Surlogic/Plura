package com.plura.plurabackend.core.feedback;

import com.plura.plurabackend.core.feedback.dto.AppFeedbackResponse;
import com.plura.plurabackend.core.feedback.dto.CreateAppFeedbackRequest;
import com.plura.plurabackend.core.feedback.model.AppFeedback;
import com.plura.plurabackend.core.feedback.model.AuthorRole;
import com.plura.plurabackend.core.feedback.model.FeedbackCategory;
import com.plura.plurabackend.core.feedback.repository.AppFeedbackRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AppFeedbackService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AppFeedbackService.class);

    private final AppFeedbackRepository appFeedbackRepository;
    private final UserRepository userRepository;

    public AppFeedbackService(AppFeedbackRepository appFeedbackRepository, UserRepository userRepository) {
        this.appFeedbackRepository = appFeedbackRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public AppFeedbackResponse create(Long userId, AuthorRole authorRole, CreateAppFeedbackRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        AppFeedback feedback = new AppFeedback();
        feedback.setAuthor(user);
        feedback.setAuthorRole(authorRole);
        feedback.setRating(request.getRating());

        String text = request.getText();
        feedback.setText(text != null ? text.trim() : null);

        String contextSource = request.getContextSource();
        feedback.setContextSource(contextSource != null ? contextSource.trim() : null);

        if (request.getCategory() != null) {
            try {
                feedback.setCategory(FeedbackCategory.valueOf(request.getCategory().trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Categoría inválida. Valores permitidos: BUG, UX, PAYMENTS, BOOKING, DISCOVERY, OTHER");
            }
        }

        feedback = appFeedbackRepository.save(feedback);
        LOGGER.info("App feedback created: id={} role={} rating={}", feedback.getId(), authorRole, request.getRating());
        return toResponse(feedback);
    }

    @Transactional(readOnly = true)
    public Page<AppFeedbackResponse> listMine(Long userId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        Page<AppFeedback> feedbackPage = appFeedbackRepository.findByAuthorIdOrderByCreatedAtDescIdDesc(
            userId, PageRequest.of(safePage, safeSize)
        );
        return feedbackPage.map(this::toResponse);
    }

    private AppFeedbackResponse toResponse(AppFeedback feedback) {
        return new AppFeedbackResponse(
            feedback.getId(),
            feedback.getRating(),
            feedback.getText(),
            feedback.getCategory() != null ? feedback.getCategory().name() : null,
            feedback.getContextSource(),
            feedback.getCreatedAt().toString()
        );
    }
}

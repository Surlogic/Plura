package com.plura.plurabackend.core.feedback.ops;

import com.plura.plurabackend.core.feedback.model.AppFeedback;
import com.plura.plurabackend.core.feedback.model.AuthorRole;
import com.plura.plurabackend.core.feedback.model.FeedbackCategory;
import com.plura.plurabackend.core.feedback.model.FeedbackStatus;
import com.plura.plurabackend.core.feedback.ops.dto.InternalFeedbackAnalyticsResponse;
import com.plura.plurabackend.core.feedback.ops.dto.InternalFeedbackDetailResponse;
import com.plura.plurabackend.core.feedback.ops.dto.InternalFeedbackListItemResponse;
import com.plura.plurabackend.core.feedback.repository.AppFeedbackRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InternalAppFeedbackOpsService {

    private final AppFeedbackRepository appFeedbackRepository;

    public InternalAppFeedbackOpsService(AppFeedbackRepository appFeedbackRepository) {
        this.appFeedbackRepository = appFeedbackRepository;
    }

    @Transactional(readOnly = true)
    public Page<InternalFeedbackListItemResponse> list(
        int page, int size,
        String authorRole, String category, Integer rating, String status,
        String from, String to
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        AuthorRole roleFilter = parseEnum(authorRole, AuthorRole.class);
        FeedbackCategory categoryFilter = parseEnum(category, FeedbackCategory.class);
        FeedbackStatus statusFilter = parseEnum(status, FeedbackStatus.class);
        LocalDateTime fromDt = parseDate(from, true);
        LocalDateTime toDt = parseDate(to, false);

        Page<AppFeedback> feedbackPage = appFeedbackRepository.findAllFiltered(
            roleFilter, categoryFilter, rating, statusFilter, fromDt, toDt,
            PageRequest.of(safePage, safeSize)
        );
        return feedbackPage.map(this::toListItem);
    }

    @Transactional(readOnly = true)
    public InternalFeedbackDetailResponse detail(Long id) {
        AppFeedback feedback = appFeedbackRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback no encontrado"));
        return toDetail(feedback);
    }

    @Transactional
    public InternalFeedbackDetailResponse archive(Long id) {
        AppFeedback feedback = appFeedbackRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback no encontrado"));
        feedback.setStatus(FeedbackStatus.ARCHIVED);
        feedback = appFeedbackRepository.save(feedback);
        return toDetail(feedback);
    }

    @Transactional
    public InternalFeedbackDetailResponse unarchive(Long id) {
        AppFeedback feedback = appFeedbackRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback no encontrado"));
        feedback.setStatus(FeedbackStatus.ACTIVE);
        feedback = appFeedbackRepository.save(feedback);
        return toDetail(feedback);
    }

    @Transactional(readOnly = true)
    public InternalFeedbackAnalyticsResponse analytics(String from, String to) {
        LocalDateTime fromDt = parseDate(from, true);
        LocalDateTime toDt = parseDate(to, false);

        long total = appFeedbackRepository.countFiltered(fromDt, toDt);
        Double avg = appFeedbackRepository.averageRating(fromDt, toDt);

        Map<String, Long> byRole = appFeedbackRepository.countByAuthorRole(fromDt, toDt).stream()
            .collect(Collectors.toMap(
                r -> ((AuthorRole) r[0]).name(),
                r -> (Long) r[1],
                (a, b) -> a,
                LinkedHashMap::new
            ));

        Map<String, Long> byCat = appFeedbackRepository.countByCategory(fromDt, toDt).stream()
            .collect(Collectors.toMap(
                r -> ((FeedbackCategory) r[0]).name(),
                r -> (Long) r[1],
                (a, b) -> a,
                LinkedHashMap::new
            ));

        Map<Integer, Long> byRating = appFeedbackRepository.countByRating(fromDt, toDt).stream()
            .collect(Collectors.toMap(
                r -> (Integer) r[0],
                r -> (Long) r[1],
                (a, b) -> a,
                LinkedHashMap::new
            ));

        List<InternalFeedbackAnalyticsResponse.DailyCount> daily = appFeedbackRepository.dailyStats(fromDt, toDt).stream()
            .map(r -> new InternalFeedbackAnalyticsResponse.DailyCount(
                r[0].toString(),
                (Long) r[1],
                ((Number) r[2]).doubleValue()
            ))
            .toList();

        return new InternalFeedbackAnalyticsResponse(total, avg, byRole, byCat, byRating, daily);
    }

    private InternalFeedbackListItemResponse toListItem(AppFeedback f) {
        return new InternalFeedbackListItemResponse(
            f.getId(),
            f.getAuthor().getId(),
            f.getAuthor().getFullName(),
            f.getAuthorRole().name(),
            f.getRating(),
            f.getText(),
            f.getCategory() != null ? f.getCategory().name() : null,
            f.getContextSource(),
            f.getStatus().name(),
            f.getCreatedAt().toString()
        );
    }

    private InternalFeedbackDetailResponse toDetail(AppFeedback f) {
        return new InternalFeedbackDetailResponse(
            f.getId(),
            f.getAuthor().getId(),
            f.getAuthor().getFullName(),
            f.getAuthorRole().name(),
            f.getRating(),
            f.getText(),
            f.getCategory() != null ? f.getCategory().name() : null,
            f.getContextSource(),
            f.getStatus().name(),
            f.getCreatedAt().toString(),
            f.getUpdatedAt().toString()
        );
    }

    private <T extends Enum<T>> T parseEnum(String value, Class<T> enumType) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Enum.valueOf(enumType, value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valor inválido: " + value);
        }
    }

    private LocalDateTime parseDate(String value, boolean startOfDay) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            LocalDate date = LocalDate.parse(value.trim());
            return startOfDay ? date.atStartOfDay() : date.plusDays(1).atStartOfDay();
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha inválida: " + value + ". Formato esperado: YYYY-MM-DD");
        }
    }
}

package com.plura.plurabackend.core.review.ops;

import com.plura.plurabackend.core.review.model.BookingReview;
import com.plura.plurabackend.core.review.ops.dto.InternalReviewAnalyticsResponse;
import com.plura.plurabackend.core.review.ops.dto.InternalReviewDetailResponse;
import com.plura.plurabackend.core.review.ops.dto.InternalReviewListItemResponse;
import com.plura.plurabackend.core.review.repository.BookingReviewRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InternalBookingReviewOpsService {

    private final BookingReviewRepository bookingReviewRepository;

    public InternalBookingReviewOpsService(BookingReviewRepository bookingReviewRepository) {
        this.bookingReviewRepository = bookingReviewRepository;
    }

    @Transactional(readOnly = true)
    public Page<InternalReviewListItemResponse> list(
        int page, int size,
        Long professionalId, Integer rating,
        Boolean hasText, Boolean textHidden,
        String from, String to
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size, 100));
        LocalDateTime fromDate = parseDate(from);
        LocalDateTime toDate = parseDateEnd(to);

        return bookingReviewRepository.findAllFiltered(
            professionalId, rating, hasText, textHidden, fromDate, toDate,
            PageRequest.of(safePage, safeSize)
        ).map(this::toListItem);
    }

    @Transactional(readOnly = true)
    public InternalReviewDetailResponse detail(Long id) {
        BookingReview review = bookingReviewRepository.findDetailedById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reseña no encontrada"));
        return toDetail(review);
    }

    @Transactional
    public InternalReviewDetailResponse hideText(Long id, String note) {
        BookingReview review = bookingReviewRepository.findDetailedById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reseña no encontrada"));
        review.setTextHiddenByInternalOps(true);
        if (note != null && !note.isBlank()) {
            review.setInternalModerationNote(note.trim());
        }
        bookingReviewRepository.save(review);
        return toDetail(review);
    }

    @Transactional
    public InternalReviewDetailResponse showText(Long id) {
        BookingReview review = bookingReviewRepository.findDetailedById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reseña no encontrada"));
        review.setTextHiddenByInternalOps(false);
        bookingReviewRepository.save(review);
        return toDetail(review);
    }

    @Transactional(readOnly = true)
    public InternalReviewAnalyticsResponse analytics(String from, String to) {
        LocalDateTime fromDate = parseDate(from);
        LocalDateTime toDate = parseDateEnd(to);

        long total = bookingReviewRepository.countFiltered(fromDate, toDate);
        Double avg = bookingReviewRepository.averageRatingFiltered(fromDate, toDate);
        long withText = bookingReviewRepository.countWithText(fromDate, toDate);
        long withoutText = bookingReviewRepository.countWithoutText(fromDate, toDate);
        long textHidden = bookingReviewRepository.countTextHidden(fromDate, toDate);

        Map<Integer, Long> byRating = new LinkedHashMap<>();
        for (Object[] row : bookingReviewRepository.countByRating(fromDate, toDate)) {
            byRating.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue());
        }

        List<InternalReviewAnalyticsResponse.TopProfessional> topVolume =
            bookingReviewRepository.topProfessionalsByVolume(fromDate, toDate, PageRequest.of(0, 10))
                .stream()
                .map(row -> new InternalReviewAnalyticsResponse.TopProfessional(
                    ((Number) row[0]).longValue(),
                    (String) row[1],
                    (String) row[2],
                    ((Number) row[3]).longValue(),
                    ((Number) row[4]).doubleValue()
                ))
                .toList();

        List<InternalReviewAnalyticsResponse.TopProfessional> topRating =
            bookingReviewRepository.topProfessionalsByRating(fromDate, toDate, PageRequest.of(0, 10))
                .stream()
                .map(row -> new InternalReviewAnalyticsResponse.TopProfessional(
                    ((Number) row[0]).longValue(),
                    (String) row[1],
                    (String) row[2],
                    ((Number) row[3]).longValue(),
                    ((Number) row[4]).doubleValue()
                ))
                .toList();

        List<InternalReviewAnalyticsResponse.DailyCount> daily =
            bookingReviewRepository.dailyStats(fromDate, toDate)
                .stream()
                .map(row -> new InternalReviewAnalyticsResponse.DailyCount(
                    row[0].toString(),
                    ((Number) row[1]).longValue(),
                    ((Number) row[2]).doubleValue()
                ))
                .toList();

        return new InternalReviewAnalyticsResponse(
            total, avg, byRating, withText, withoutText, textHidden,
            topVolume, topRating, daily
        );
    }

    private InternalReviewListItemResponse toListItem(BookingReview r) {
        return new InternalReviewListItemResponse(
            r.getId(),
            r.getBooking().getId(),
            r.getProfessional().getId(),
            r.getProfessional().getUser().getFullName(),
            r.getProfessional().getSlug(),
            r.getUser().getId(),
            r.getUser().getFullName(),
            r.getRating(),
            r.getReviewText(),
            Boolean.TRUE.equals(r.getTextHiddenByProfessional()),
            Boolean.TRUE.equals(r.getTextHiddenByInternalOps()),
            r.getInternalModerationNote(),
            r.getCreatedAt().toString()
        );
    }

    private InternalReviewDetailResponse toDetail(BookingReview r) {
        return new InternalReviewDetailResponse(
            r.getId(),
            r.getBooking().getId(),
            r.getProfessional().getId(),
            r.getProfessional().getUser().getFullName(),
            r.getProfessional().getSlug(),
            r.getUser().getId(),
            r.getUser().getFullName(),
            r.getRating(),
            r.getReviewText(),
            Boolean.TRUE.equals(r.getTextHiddenByProfessional()),
            r.getTextHiddenAt() != null ? r.getTextHiddenAt().toString() : null,
            Boolean.TRUE.equals(r.getTextHiddenByInternalOps()),
            r.getInternalModerationNote(),
            r.getCreatedAt().toString(),
            r.getUpdatedAt().toString()
        );
    }

    private LocalDateTime parseDate(String date) {
        if (date == null || date.isBlank()) return null;
        try {
            return LocalDate.parse(date.trim()).atStartOfDay();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha inválida: " + date);
        }
    }

    private LocalDateTime parseDateEnd(String date) {
        if (date == null || date.isBlank()) return null;
        try {
            return LocalDate.parse(date.trim()).plusDays(1).atStartOfDay();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha inválida: " + date);
        }
    }
}

package com.plura.plurabackend.core.review.ops;

import com.plura.plurabackend.core.review.dto.ReviewReportSummaryResponse;
import com.plura.plurabackend.core.review.model.BookingReview;
import com.plura.plurabackend.core.review.model.BookingReviewReport;
import com.plura.plurabackend.core.review.ops.dto.InternalReviewAnalyticsResponse;
import com.plura.plurabackend.core.review.ops.dto.InternalReviewDetailResponse;
import com.plura.plurabackend.core.review.ops.dto.InternalReviewListItemResponse;
import com.plura.plurabackend.core.review.repository.BookingReviewReportRepository;
import com.plura.plurabackend.core.review.repository.BookingReviewRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * InternalBookingReviewOpsService es un servicio de negocio del modulo resenas / operaciones internas.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: bookingReviewRepository, bookingReviewReportRepository.
 * Foco funcional: paneles internos, reservas, servicios, resenas.
 */
@Service
public class InternalBookingReviewOpsService {

    private final BookingReviewRepository bookingReviewRepository;
    private final BookingReviewReportRepository bookingReviewReportRepository;

    public InternalBookingReviewOpsService(
        BookingReviewRepository bookingReviewRepository,
        BookingReviewReportRepository bookingReviewReportRepository
    ) {
        this.bookingReviewRepository = bookingReviewRepository;
        this.bookingReviewReportRepository = bookingReviewReportRepository;
    }

    /**
     * Devuelve un listado de elementos del modulo aplicando los filtros disponibles.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
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

        Page<BookingReview> reviewsPage = bookingReviewRepository.findAllFiltered(
            professionalId, rating, hasText, textHidden, fromDate, toDate,
            PageRequest.of(safePage, safeSize)
        );
        Map<Long, ReviewReportBundle> reportBundles = loadReportBundles(reviewsPage.getContent());
        List<InternalReviewListItemResponse> items = reviewsPage.getContent().stream()
            .map(review -> toListItem(review, reportBundles.get(review.getId())))
            .toList();
        return PageableExecutionUtils.getPage(items, reviewsPage.getPageable(), reviewsPage::getTotalElements);
    }

    /**
     * Devuelve el detalle de un elemento puntual con los datos necesarios para la pantalla o API.
     */
    @Transactional(readOnly = true)
    public InternalReviewDetailResponse detail(Long id) {
        BookingReview review = bookingReviewRepository.findDetailedById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reseña no encontrada"));
        return toDetail(review, loadReportBundle(review.getId()));
    }

    /**
     * Ejecuta la logica de hide text manteniendola encapsulada en este componente.
     */
    @Transactional
    public InternalReviewDetailResponse hideText(Long id, String note) {
        BookingReview review = bookingReviewRepository.findDetailedById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reseña no encontrada"));
        review.setTextHiddenByInternalOps(true);
        if (note != null && !note.isBlank()) {
            review.setInternalModerationNote(note.trim());
        }
        bookingReviewRepository.save(review);
        return toDetail(review, loadReportBundle(review.getId()));
    }

    /**
     * Ejecuta la logica de show text manteniendola encapsulada en este componente.
     */
    @Transactional
    public InternalReviewDetailResponse showText(Long id) {
        BookingReview review = bookingReviewRepository.findDetailedById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reseña no encontrada"));
        review.setTextHiddenByInternalOps(false);
        bookingReviewRepository.save(review);
        return toDetail(review, loadReportBundle(review.getId()));
    }

    /**
     * Ejecuta la logica de analytics manteniendola encapsulada en este componente.
     */
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

    /**
     * Convierte datos internos al formato listado item esperado por el consumidor.
     */
    private InternalReviewListItemResponse toListItem(BookingReview r) {
        return toListItem(r, null);
    }

    /**
     * Convierte datos internos al formato listado item esperado por el consumidor.
     */
    private InternalReviewListItemResponse toListItem(BookingReview r, ReviewReportBundle reportBundle) {
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
            reportBundle != null && reportBundle.reported(),
            reportBundle != null ? reportBundle.reportCount() : 0L,
            reportBundle != null ? reportBundle.latestReport() : null,
            r.getInternalModerationNote(),
            r.getCreatedAt().toString()
        );
    }

    /**
     * Convierte datos internos al formato detalle esperado por el consumidor.
     */
    private InternalReviewDetailResponse toDetail(BookingReview r, ReviewReportBundle reportBundle) {
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
            reportBundle != null && reportBundle.reported(),
            reportBundle != null ? reportBundle.reportCount() : 0L,
            reportBundle != null ? reportBundle.latestReport() : null,
            r.getInternalModerationNote(),
            r.getCreatedAt().toString(),
            r.getUpdatedAt().toString()
        );
    }

    /**
     * Carga la seccion report bundles desde base de datos o datos agregados y la deja lista para la respuesta.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    private Map<Long, ReviewReportBundle> loadReportBundles(Collection<BookingReview> reviews) {
        if (reviews == null || reviews.isEmpty()) {
            return Map.of();
        }

        List<Long> reviewIds = reviews.stream().map(BookingReview::getId).toList();
        List<BookingReviewReport> reports = bookingReviewReportRepository.findByReview_IdInOrderByCreatedAtDescIdDesc(reviewIds);
        Map<Long, ReviewReportBundle> bundles = new HashMap<>();

        for (BookingReviewReport report : reports) {
            Long reviewId = report.getReview().getId();
            ReviewReportBundle current = bundles.get(reviewId);
            if (current == null) {
                bundles.put(reviewId, new ReviewReportBundle(true, 1L, toSummary(report)));
            } else {
                bundles.put(reviewId, new ReviewReportBundle(true, current.reportCount() + 1L, current.latestReport()));
            }
        }

        return bundles;
    }

    /**
     * Carga la seccion report bundle desde base de datos o datos agregados y la deja lista para la respuesta.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    private ReviewReportBundle loadReportBundle(Long reviewId) {
        if (reviewId == null) {
            return null;
        }
        List<BookingReviewReport> reports = bookingReviewReportRepository.findByReview_IdInOrderByCreatedAtDescIdDesc(List.of(reviewId));
        if (reports.isEmpty()) {
            return null;
        }
        return new ReviewReportBundle(true, reports.size(), toSummary(reports.get(0)));
    }

    /**
     * Convierte datos internos al formato resumen esperado por el consumidor.
     */
    private ReviewReportSummaryResponse toSummary(BookingReviewReport report) {
        return new ReviewReportSummaryResponse(
            report.getId(),
            report.getReason(),
            report.getNote(),
            report.getStatus(),
            report.getCreatedAt() != null ? report.getCreatedAt().toString() : null,
            report.getResolvedAt() != null ? report.getResolvedAt().toString() : null
        );
    }

    /**
     * Parsea fecha y convierte errores de formato en errores controlados.
     */
    private LocalDateTime parseDate(String date) {
        if (date == null || date.isBlank()) return null;
        try {
            return LocalDate.parse(date.trim()).atStartOfDay();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha inválida: " + date);
        }
    }

    /**
     * Parsea fecha end y convierte errores de formato en errores controlados.
     */
    private LocalDateTime parseDateEnd(String date) {
        if (date == null || date.isBlank()) return null;
        try {
            return LocalDate.parse(date.trim()).plusDays(1).atStartOfDay();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha inválida: " + date);
        }
    }

    /**
     * Bloque de datos review report bundle usado internamente por esta clase.
     * Agrupa valores relacionados para que el calculo principal sea mas legible.
     */
    private record ReviewReportBundle(
        boolean reported,
        long reportCount,
        ReviewReportSummaryResponse latestReport
    ) {
    }
}

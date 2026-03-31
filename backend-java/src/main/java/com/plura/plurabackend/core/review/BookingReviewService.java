package com.plura.plurabackend.core.review;

import com.plura.plurabackend.core.booking.ProfessionalActorLookupGateway;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.review.dto.BookingReviewReportResponse;
import com.plura.plurabackend.core.review.dto.BookingReviewResponse;
import com.plura.plurabackend.core.review.dto.CreateBookingReviewRequest;
import com.plura.plurabackend.core.review.dto.CreateBookingReviewReportRequest;
import com.plura.plurabackend.core.review.model.BookingReview;
import com.plura.plurabackend.core.review.model.BookingReviewReport;
import com.plura.plurabackend.core.review.model.BookingReviewReportStatus;
import com.plura.plurabackend.core.review.repository.BookingReviewReportRepository;
import com.plura.plurabackend.core.review.repository.BookingReviewRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingReviewService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BookingReviewService.class);

    private final BookingReviewRepository bookingReviewRepository;
    private final BookingReviewReportRepository bookingReviewReportRepository;
    private final BookingRepository bookingRepository;
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfessionalActorLookupGateway professionalActorLookupGateway;
    private final ReviewNotificationIntegrationService reviewNotificationIntegrationService;

    public BookingReviewService(
        BookingReviewRepository bookingReviewRepository,
        BookingReviewReportRepository bookingReviewReportRepository,
        BookingRepository bookingRepository,
        ProfessionalProfileRepository professionalProfileRepository,
        ProfessionalActorLookupGateway professionalActorLookupGateway,
        ReviewNotificationIntegrationService reviewNotificationIntegrationService
    ) {
        this.bookingReviewRepository = bookingReviewRepository;
        this.bookingReviewReportRepository = bookingReviewReportRepository;
        this.bookingRepository = bookingRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.professionalActorLookupGateway = professionalActorLookupGateway;
        this.reviewNotificationIntegrationService = reviewNotificationIntegrationService;
    }

    @Transactional
    public BookingReviewResponse createReview(Long bookingId, Long clientUserId, CreateBookingReviewRequest request) {
        Booking booking = bookingRepository.findDetailedById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));

        if (booking.getUser() == null || !clientUserId.equals(booking.getUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }
        if (booking.getOperationalStatus() != BookingOperationalStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solo se pueden reseñar reservas completadas.");
        }
        if (bookingReviewRepository.existsByBooking_Id(bookingId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una reseña para esta reserva.");
        }

        ProfessionalProfile professional = professionalProfileRepository.findById(booking.getProfessionalId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));

        String reviewText = normalizeText(request.getText());

        BookingReview review = new BookingReview();
        review.setBooking(booking);
        review.setProfessional(professional);
        review.setUser(booking.getUser());
        review.setRating(request.getRating());
        review.setReviewText(reviewText);
        review.setTextHiddenByProfessional(false);

        try {
            review = bookingReviewRepository.saveAndFlush(review);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una reseña para esta reserva.");
        }

        recomputeAggregate(professional.getId());

        try {
            reviewNotificationIntegrationService.notifyReviewReceived(review, booking);
        } catch (Exception e) {
            LOGGER.warn("Failed to send REVIEW_RECEIVED notification for reviewId={}: {}", review.getId(), e.getMessage());
        }

        LOGGER.info("Review created: reviewId={} bookingId={} professionalId={} rating={}",
            review.getId(), bookingId, professional.getId(), request.getRating());

        return toClientResponse(review, booking.getUser().getFullName());
    }

    @Transactional
    public void deleteReviewByBookingId(Long bookingId, Long clientUserId) {
        Booking booking = bookingRepository.findDetailedById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));

        if (booking.getUser() == null || !clientUserId.equals(booking.getUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }

        BookingReview review = bookingReviewRepository.findByBooking_Id(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reseña no encontrada"));

        Long professionalId = review.getProfessional().getId();
        bookingReviewRepository.delete(review);
        bookingReviewRepository.flush();
        recomputeAggregate(professionalId);

        LOGGER.info("Review deleted by client: reviewId={} bookingId={} professionalId={} clientUserId={}",
            review.getId(), bookingId, professionalId, clientUserId);
    }

    @Transactional(readOnly = true)
    public Optional<BookingReviewResponse> getReviewByBookingId(Long bookingId, Long clientUserId) {
        Booking booking = bookingRepository.findDetailedById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));

        if (booking.getUser() == null || !clientUserId.equals(booking.getUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }

        return bookingReviewRepository.findByBooking_Id(bookingId)
            .map(review -> toClientResponse(review, booking.getUser().getFullName()));
    }

    @Transactional(readOnly = true)
    public Page<BookingReviewResponse> listPublicReviews(String professionalSlug, Pageable pageable) {
        ProfessionalProfile professional = professionalProfileRepository.findBySlug(professionalSlug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));

        return bookingReviewRepository.findPublicByProfessionalId(professional.getId(), pageable)
            .map(this::toPublicResponse);
    }

    @Transactional(readOnly = true)
    public Page<BookingReviewResponse> listProfessionalReviews(Long professionalUserId, Pageable pageable) {
        Long professionalId = professionalActorLookupGateway.findProfessionalIdByUserId(professionalUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil profesional no encontrado"));

        Page<BookingReview> reviewsPage = bookingReviewRepository.findProfessionalDashboardReviews(professionalId, pageable);
        List<BookingReview> reviews = reviewsPage.getContent();
        Set<Long> reportedReviewIds = findOpenReportedReviewIds(professionalId, reviews);
        List<BookingReviewResponse> responses = reviews.stream()
            .map(review -> toProfessionalResponse(review, reportedReviewIds.contains(review.getId())))
            .toList();

        return PageableExecutionUtils.getPage(responses, pageable, reviewsPage::getTotalElements);
    }

    @Transactional
    public void hideReviewText(Long reviewId, Long professionalUserId) {
        Long professionalId = professionalActorLookupGateway.findProfessionalIdByUserId(professionalUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil profesional no encontrado"));

        BookingReview review = bookingReviewRepository.findDetailedByIdAndProfessionalId(reviewId, professionalId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reseña no encontrada"));

        review.setTextHiddenByProfessional(true);
        review.setTextHiddenAt(LocalDateTime.now());
        bookingReviewRepository.save(review);
    }

    @Transactional
    public void showReviewText(Long reviewId, Long professionalUserId) {
        Long professionalId = professionalActorLookupGateway.findProfessionalIdByUserId(professionalUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil profesional no encontrado"));

        BookingReview review = bookingReviewRepository.findDetailedByIdAndProfessionalId(reviewId, professionalId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reseña no encontrada"));

        review.setTextHiddenByProfessional(false);
        review.setTextHiddenAt(null);
        bookingReviewRepository.save(review);
    }

    @Transactional
    public BookingReviewReportResponse reportReview(
        Long reviewId,
        Long professionalUserId,
        CreateBookingReviewReportRequest request
    ) {
        Long professionalId = professionalActorLookupGateway.findProfessionalIdByUserId(professionalUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil profesional no encontrado"));

        BookingReview review = bookingReviewRepository.findDetailedByIdAndProfessionalId(reviewId, professionalId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reseña no encontrada"));

        if (bookingReviewReportRepository.existsByReview_IdAndProfessional_IdAndStatus(
            reviewId,
            professionalId,
            BookingReviewReportStatus.OPEN
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un reporte abierto para esta reseña.");
        }

        BookingReviewReport report = new BookingReviewReport();
        report.setReview(review);
        report.setProfessional(review.getProfessional());
        report.setReason(request.getReason());
        report.setNote(normalizeText(request.getNote()));
        report.setStatus(BookingReviewReportStatus.OPEN);

        try {
            report = bookingReviewReportRepository.saveAndFlush(report);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un reporte abierto para esta reseña.");
        }

        LOGGER.info("Review reported: reviewId={} reportId={} professionalId={} reason={}",
            reviewId, report.getId(), professionalId, request.getReason());

        return toReportResponse(report);
    }

    @Transactional
    public void recomputeAggregate(Long professionalId) {
        Object[] result = bookingReviewRepository.findRatingAggregateByProfessionalId(professionalId);
        double avgRating = result[0] == null ? 0d : ((Number) result[0]).doubleValue();
        int count = result[1] == null ? 0 : ((Number) result[1]).intValue();

        professionalProfileRepository.findById(professionalId).ifPresent(profile -> {
            profile.setRating(avgRating);
            profile.setReviewsCount(count);
            professionalProfileRepository.save(profile);
        });
    }

    @Transactional
    public void recomputeAllAggregates() {
        LOGGER.info("Recomputing review aggregates (batch)");
        int updated = bookingReviewRepository.batchUpdateAllAggregates();
        LOGGER.info("Review aggregate batch recompute completed, updated {} professionals", updated);
    }

    private BookingReviewResponse toClientResponse(BookingReview review, String authorDisplayName) {
        return new BookingReviewResponse(
            review.getId(),
            review.getBooking().getId(),
            review.getProfessional().getId(),
            review.getRating(),
            review.getReviewText(),
            authorDisplayName,
            review.getTextHiddenByProfessional() != null && review.getTextHiddenByProfessional(),
            false,
            review.getCreatedAt(),
            review.getUpdatedAt()
        );
    }

    private BookingReviewResponse toPublicResponse(BookingReview review) {
        boolean hiddenByProfessional = Boolean.TRUE.equals(review.getTextHiddenByProfessional());
        boolean hiddenByOps = Boolean.TRUE.equals(review.getTextHiddenByInternalOps());
        boolean hidden = hiddenByProfessional || hiddenByOps;
        return new BookingReviewResponse(
            review.getId(),
            review.getBooking().getId(),
            review.getProfessional().getId(),
            review.getRating(),
            hidden ? null : review.getReviewText(),
            review.getUser().getFullName(),
            hidden,
            false,
            review.getCreatedAt(),
            review.getUpdatedAt()
        );
    }

    private BookingReviewResponse toProfessionalResponse(BookingReview review, boolean reportedByProfessional) {
        boolean hidden = review.getTextHiddenByProfessional() != null && review.getTextHiddenByProfessional();
        return new BookingReviewResponse(
            review.getId(),
            review.getBooking().getId(),
            review.getProfessional().getId(),
            review.getRating(),
            review.getReviewText(),
            review.getUser().getFullName(),
            hidden,
            reportedByProfessional,
            review.getCreatedAt(),
            review.getUpdatedAt()
        );
    }

    private BookingReviewReportResponse toReportResponse(BookingReviewReport report) {
        return new BookingReviewReportResponse(
            report.getId(),
            report.getReview().getId(),
            report.getProfessional().getId(),
            report.getReason(),
            report.getNote(),
            report.getStatus(),
            report.getCreatedAt(),
            report.getResolvedAt()
        );
    }

    private Set<Long> findOpenReportedReviewIds(Long professionalId, List<BookingReview> reviews) {
        if (reviews.isEmpty()) {
            return Set.of();
        }
        List<Long> reviewIds = reviews.stream().map(BookingReview::getId).toList();
        return new HashSet<>(bookingReviewReportRepository.findReportedReviewIdsByProfessionalIdAndStatus(
            professionalId,
            BookingReviewReportStatus.OPEN,
            reviewIds
        ));
    }

    private String normalizeText(String text) {
        if (text == null) {
            return null;
        }
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

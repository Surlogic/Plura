package com.plura.plurabackend.core.review.repository;

import com.plura.plurabackend.core.review.model.BookingReviewReport;
import com.plura.plurabackend.core.review.model.BookingReviewReportStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingReviewReportRepository extends JpaRepository<BookingReviewReport, Long> {

    boolean existsByReview_IdAndProfessional_IdAndStatus(
        Long reviewId,
        Long professionalId,
        BookingReviewReportStatus status
    );

    @Query(
        """
        SELECT DISTINCT report.review.id
        FROM BookingReviewReport report
        WHERE report.professional.id = :professionalId
          AND report.status = :status
          AND report.review.id IN :reviewIds
        """
    )
    List<Long> findReportedReviewIdsByProfessionalIdAndStatus(
        @Param("professionalId") Long professionalId,
        @Param("status") BookingReviewReportStatus status,
        @Param("reviewIds") Collection<Long> reviewIds
    );

    List<BookingReviewReport> findByReview_IdInOrderByCreatedAtDescIdDesc(Collection<Long> reviewIds);
}

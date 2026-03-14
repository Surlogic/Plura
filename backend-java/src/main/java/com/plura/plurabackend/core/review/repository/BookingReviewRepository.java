package com.plura.plurabackend.core.review.repository;

import com.plura.plurabackend.core.review.model.BookingReview;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingReviewRepository extends JpaRepository<BookingReview, Long> {
    boolean existsByBooking_Id(Long bookingId);

    Optional<BookingReview> findByBooking_Id(Long bookingId);

    @Query(
        """
        SELECT r
        FROM BookingReview r
        JOIN FETCH r.booking b
        JOIN FETCH r.professional p
        JOIN FETCH p.user pu
        JOIN FETCH r.user u
        LEFT JOIN FETCH r.businessRepliedByUser replyUser
        WHERE r.id = :reviewId
        """
    )
    Optional<BookingReview> findDetailedById(@Param("reviewId") Long reviewId);

    @Query(
        value = """
            SELECT COALESCE(AVG(r.rating), 0), COUNT(r.id)
            FROM BookingReview r
            WHERE r.professional.id = :professionalId
            """
    )
    Object[] findRatingAggregateByProfessionalId(@Param("professionalId") Long professionalId);

    Page<BookingReview> findByProfessional_IdOrderByCreatedAtDesc(Long professionalId, Pageable pageable);
}

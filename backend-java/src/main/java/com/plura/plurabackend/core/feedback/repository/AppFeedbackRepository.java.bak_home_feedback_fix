package com.plura.plurabackend.core.feedback.repository;

import com.plura.plurabackend.core.feedback.model.AppFeedback;
import com.plura.plurabackend.core.feedback.model.AuthorRole;
import com.plura.plurabackend.core.feedback.model.FeedbackCategory;
import com.plura.plurabackend.core.feedback.model.FeedbackStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppFeedbackRepository extends JpaRepository<AppFeedback, Long> {

    @Query(
        value = """
            SELECT f
            FROM AppFeedback f
            WHERE f.author.id = :authorUserId
            ORDER BY f.createdAt DESC, f.id DESC
            """,
        countQuery = """
            SELECT COUNT(f)
            FROM AppFeedback f
            WHERE f.author.id = :authorUserId
            """
    )
    Page<AppFeedback> findByAuthorIdOrderByCreatedAtDescIdDesc(
        @Param("authorUserId") Long authorUserId, Pageable pageable
    );

    @Query(
        value = """
            SELECT f
            FROM AppFeedback f
            JOIN FETCH f.author
            WHERE (:authorRole IS NULL OR f.authorRole = :authorRole)
              AND (:category IS NULL OR f.category = :category)
              AND (:rating IS NULL OR f.rating = :rating)
              AND (:status IS NULL OR f.status = :status)
              AND (:from IS NULL OR f.createdAt >= :from)
              AND (:to IS NULL OR f.createdAt <= :to)
            ORDER BY f.createdAt DESC, f.id DESC
            """,
        countQuery = """
            SELECT COUNT(f)
            FROM AppFeedback f
            WHERE (:authorRole IS NULL OR f.authorRole = :authorRole)
              AND (:category IS NULL OR f.category = :category)
              AND (:rating IS NULL OR f.rating = :rating)
              AND (:status IS NULL OR f.status = :status)
              AND (:from IS NULL OR f.createdAt >= :from)
              AND (:to IS NULL OR f.createdAt <= :to)
            """
    )
    Page<AppFeedback> findAllFiltered(
        @Param("authorRole") AuthorRole authorRole,
        @Param("category") FeedbackCategory category,
        @Param("rating") Integer rating,
        @Param("status") FeedbackStatus status,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to,
        Pageable pageable
    );

    @Query("SELECT COUNT(f) FROM AppFeedback f WHERE (:from IS NULL OR f.createdAt >= :from) AND (:to IS NULL OR f.createdAt <= :to)")
    long countFiltered(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT AVG(f.rating) FROM AppFeedback f WHERE (:from IS NULL OR f.createdAt >= :from) AND (:to IS NULL OR f.createdAt <= :to)")
    Double averageRating(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT f.authorRole, COUNT(f) FROM AppFeedback f WHERE (:from IS NULL OR f.createdAt >= :from) AND (:to IS NULL OR f.createdAt <= :to) GROUP BY f.authorRole")
    List<Object[]> countByAuthorRole(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT f.category, COUNT(f) FROM AppFeedback f WHERE f.category IS NOT NULL AND (:from IS NULL OR f.createdAt >= :from) AND (:to IS NULL OR f.createdAt <= :to) GROUP BY f.category")
    List<Object[]> countByCategory(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT f.rating, COUNT(f) FROM AppFeedback f WHERE (:from IS NULL OR f.createdAt >= :from) AND (:to IS NULL OR f.createdAt <= :to) GROUP BY f.rating ORDER BY f.rating")
    List<Object[]> countByRating(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT CAST(f.createdAt AS LocalDate), COUNT(f), AVG(f.rating) FROM AppFeedback f WHERE (:from IS NULL OR f.createdAt >= :from) AND (:to IS NULL OR f.createdAt <= :to) GROUP BY CAST(f.createdAt AS LocalDate) ORDER BY CAST(f.createdAt AS LocalDate)")
    List<Object[]> dailyStats(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}

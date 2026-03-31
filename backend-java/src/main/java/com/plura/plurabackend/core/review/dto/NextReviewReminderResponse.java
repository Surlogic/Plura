package com.plura.plurabackend.core.review.dto;

public record NextReviewReminderResponse(
    boolean exists,
    ReviewReminderResponse reminder
) {
    public static NextReviewReminderResponse missing() {
        return new NextReviewReminderResponse(false, null);
    }

    public static NextReviewReminderResponse found(ReviewReminderResponse reminder) {
        return new NextReviewReminderResponse(true, reminder);
    }
}

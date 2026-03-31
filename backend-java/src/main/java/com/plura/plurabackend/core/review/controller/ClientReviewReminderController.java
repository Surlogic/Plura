package com.plura.plurabackend.core.review.controller;

import com.plura.plurabackend.core.review.BookingReviewReminderService;
import com.plura.plurabackend.core.review.dto.NextReviewReminderResponse;
import com.plura.plurabackend.core.review.dto.ReviewReminderShownResponse;
import com.plura.plurabackend.core.security.CurrentActorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cliente/review-reminders")
public class ClientReviewReminderController {

    private final BookingReviewReminderService bookingReviewReminderService;
    private final CurrentActorService currentActorService;

    public ClientReviewReminderController(
        BookingReviewReminderService bookingReviewReminderService,
        CurrentActorService currentActorService
    ) {
        this.bookingReviewReminderService = bookingReviewReminderService;
        this.currentActorService = currentActorService;
    }

    @GetMapping("/next")
    public ResponseEntity<NextReviewReminderResponse> getNextReminder() {
        Long clientUserId = currentActorService.currentClientUserId();
        return ResponseEntity.ok(
            bookingReviewReminderService.findNextReminder(clientUserId)
                .map(NextReviewReminderResponse::found)
                .orElseGet(NextReviewReminderResponse::missing)
        );
    }

    @PostMapping("/{bookingId}/shown")
    public ResponseEntity<ReviewReminderShownResponse> markReminderShown(@PathVariable Long bookingId) {
        Long clientUserId = currentActorService.currentClientUserId();
        return ResponseEntity.ok(bookingReviewReminderService.markReminderShown(bookingId, clientUserId));
    }
}

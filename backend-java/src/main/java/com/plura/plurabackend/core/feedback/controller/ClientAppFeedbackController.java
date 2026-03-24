package com.plura.plurabackend.core.feedback.controller;

import com.plura.plurabackend.core.feedback.AppFeedbackService;
import com.plura.plurabackend.core.feedback.dto.AppFeedbackResponse;
import com.plura.plurabackend.core.feedback.dto.CreateAppFeedbackRequest;
import com.plura.plurabackend.core.feedback.model.AuthorRole;
import com.plura.plurabackend.core.security.CurrentActorService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cliente/app-feedback")
public class ClientAppFeedbackController {

    private final AppFeedbackService appFeedbackService;
    private final CurrentActorService currentActorService;

    public ClientAppFeedbackController(AppFeedbackService appFeedbackService, CurrentActorService currentActorService) {
        this.appFeedbackService = appFeedbackService;
        this.currentActorService = currentActorService;
    }

    @PostMapping
    public ResponseEntity<AppFeedbackResponse> create(@Valid @RequestBody CreateAppFeedbackRequest request) {
        Long userId = currentActorService.currentClientUserId();
        AppFeedbackResponse response = appFeedbackService.create(userId, AuthorRole.CLIENT, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/mine")
    public Page<AppFeedbackResponse> listMine(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        Long userId = currentActorService.currentClientUserId();
        return appFeedbackService.listMine(userId, page, size);
    }

    @DeleteMapping("/{feedbackId}")
    public ResponseEntity<Void> delete(@PathVariable Long feedbackId) {
        Long userId = currentActorService.currentClientUserId();
        appFeedbackService.deleteMine(feedbackId, userId);
        return ResponseEntity.noContent().build();
    }
}
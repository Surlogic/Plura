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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/profesional/app-feedback")
public class ProfessionalAppFeedbackController {

    private final AppFeedbackService appFeedbackService;
    private final CurrentActorService currentActorService;

    public ProfessionalAppFeedbackController(AppFeedbackService appFeedbackService, CurrentActorService currentActorService) {
        this.appFeedbackService = appFeedbackService;
        this.currentActorService = currentActorService;
    }

    @PostMapping
    public ResponseEntity<AppFeedbackResponse> create(@Valid @RequestBody CreateAppFeedbackRequest request) {
        Long userId = currentActorService.currentProfessionalUserId();
        AppFeedbackResponse response = appFeedbackService.create(userId, AuthorRole.PROFESSIONAL, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/mine")
    public Page<AppFeedbackResponse> listMine(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        Long userId = currentActorService.currentProfessionalUserId();
        return appFeedbackService.listMine(userId, page, size);
    }
}

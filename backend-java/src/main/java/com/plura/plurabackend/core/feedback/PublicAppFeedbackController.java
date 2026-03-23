package com.plura.plurabackend.core.feedback;

import com.plura.plurabackend.core.feedback.dto.AppFeedbackResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/app-feedback")
public class PublicAppFeedbackController {

    private final AppFeedbackService appFeedbackService;

    public PublicAppFeedbackController(AppFeedbackService appFeedbackService) {
        this.appFeedbackService = appFeedbackService;
    }

    @GetMapping
    public List<AppFeedbackResponse> listPublic(
        @RequestParam(name = "limit", defaultValue = "6") int limit
    ) {
        return appFeedbackService.listPublic(limit);
    }
}

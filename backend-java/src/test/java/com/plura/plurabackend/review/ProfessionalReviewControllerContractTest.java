package com.plura.plurabackend.review;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.plura.plurabackend.core.review.controller.ProfessionalReviewController;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;

class ProfessionalReviewControllerContractTest {

    @Test
    void controllerNoLongerExposesDeleteReviewEndpoint() {
        boolean hasDeleteMapping = Arrays.stream(ProfessionalReviewController.class.getDeclaredMethods())
            .anyMatch(method -> method.isAnnotationPresent(DeleteMapping.class));

        assertFalse(hasDeleteMapping);
    }

    @Test
    void controllerExposesReviewReportEndpoint() {
        boolean hasReportEndpoint = Arrays.stream(ProfessionalReviewController.class.getDeclaredMethods())
            .anyMatch(method -> {
                PostMapping mapping = method.getAnnotation(PostMapping.class);
                return mapping != null && Arrays.asList(mapping.value()).contains("/{reviewId}/report");
            });

        assertTrue(hasReportEndpoint);
    }
}

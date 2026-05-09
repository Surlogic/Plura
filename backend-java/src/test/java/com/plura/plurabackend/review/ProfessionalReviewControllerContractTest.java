package com.plura.plurabackend.review;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.plura.plurabackend.core.review.controller.ProfessionalReviewController;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;

/**
 * Tests de resenas y moderacion.
 * Cubren escenarios de profesional resena controller contract para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class ProfessionalReviewControllerContractTest {

    /**
     * Escenario: controller no longer exposes eliminar resena endpoint.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void controllerNoLongerExposesDeleteReviewEndpoint() {
        boolean hasDeleteMapping = Arrays.stream(ProfessionalReviewController.class.getDeclaredMethods())
            .anyMatch(method -> method.isAnnotationPresent(DeleteMapping.class));

        assertFalse(hasDeleteMapping);
    }

    /**
     * Escenario: controller exposes resena report endpoint.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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

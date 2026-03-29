package com.plura.plurabackend.core.billing;

import com.plura.plurabackend.core.billing.dto.BillingCancelRequest;
import com.plura.plurabackend.core.billing.dto.BillingCheckoutResponse;
import com.plura.plurabackend.core.billing.dto.BillingCreateSubscriptionRequest;
import com.plura.plurabackend.core.billing.dto.BillingSubscriptionResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controlador REST para las operaciones de facturación y suscripciones.
 * Expone endpoints bajo "/billing" para crear checkouts, gestionar suscripciones
 * y cancelar planes de profesionales.
 */
@RestController
@RequestMapping("/billing")
public class BillingController {

    private final BillingService billingService;

    /**
     * Constructor que inyecta el servicio de facturación.
     *
     * @param billingService servicio principal de lógica de facturación
     */
    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    /**
     * Crea una nueva suscripción para el profesional autenticado.
     *
     * @param request datos de la suscripción incluyendo el código del plan
     * @return respuesta con la URL de checkout y datos de la suscripción creada
     */
    @PostMapping("/subscription")
    public BillingCheckoutResponse createSubscription(
        @Valid @RequestBody BillingCreateSubscriptionRequest request
    ) {
        return billingService.createSubscription(request);
    }

    /**
     * Obtiene la suscripción actual del profesional autenticado.
     *
     * @return datos de la suscripción activa del profesional
     */
    @GetMapping("/subscription")
    public BillingSubscriptionResponse getSubscription() {
        return billingService.getCurrentSubscription();
    }

    /**
     * Cancela la suscripción del profesional autenticado.
     * Si no se envía body, se crea un request por defecto (cancelación no inmediata).
     *
     * @param request opciones de cancelación (puede ser null)
     * @return datos de la suscripción después de la cancelación
     */
    @PostMapping("/cancel")
    public BillingSubscriptionResponse cancelSubscription(
        @RequestBody(required = false) BillingCancelRequest request
    ) {
        return billingService.cancelSubscription(request == null ? new BillingCancelRequest() : request);
    }
}

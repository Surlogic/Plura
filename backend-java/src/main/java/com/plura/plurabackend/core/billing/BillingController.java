package com.plura.plurabackend.core.billing;

import com.plura.plurabackend.core.billing.dto.BillingCancelRequest;
import com.plura.plurabackend.core.billing.dto.BillingCheckoutResponse;
import com.plura.plurabackend.core.billing.dto.BillingCreateSubscriptionRequest;
import com.plura.plurabackend.core.billing.dto.BillingSubscriptionResponse;
import com.plura.plurabackend.core.billing.dto.ProfessionalRegistrationCheckoutResponse;
import com.plura.plurabackend.core.billing.dto.ProfessionalRegistrationCheckoutVerifyRequest;
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
    private final ProfessionalRegistrationCheckoutService professionalRegistrationCheckoutService;

    /**
     * Constructor que inyecta el servicio de facturación.
     *
     * @param billingService servicio principal de lógica de facturación
     */
    public BillingController(
        BillingService billingService,
        ProfessionalRegistrationCheckoutService professionalRegistrationCheckoutService
    ) {
        this.billingService = billingService;
        this.professionalRegistrationCheckoutService = professionalRegistrationCheckoutService;
    }

    /**
     * Endpoint POST /subscription: Crea subscription validando datos de entrada y persistiendo el resultado.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
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

    @PostMapping("/professional-registration/attach")
    public ProfessionalRegistrationCheckoutResponse attachProfessionalRegistrationCheckout(
        @Valid @RequestBody ProfessionalRegistrationCheckoutVerifyRequest request
    ) {
        return professionalRegistrationCheckoutService.attachConfirmedCheckoutToAuthenticatedProfessional(
            request.getCheckoutToken()
        );
    }
}

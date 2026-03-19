package com.plura.plurabackend.professional.paymentprovider;

import com.plura.plurabackend.core.billing.providerconnection.ProfessionalPaymentProviderConnectionService;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.professional.paymentprovider.dto.MercadoPagoOAuthStartResponse;
import com.plura.plurabackend.professional.paymentprovider.dto.ProfessionalPaymentProviderConnectionResponse;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/profesional/payment-providers/mercadopago")
public class ProfessionalMercadoPagoConnectionController {

    private final ProfessionalPaymentProviderConnectionService connectionService;
    private final RoleGuard roleGuard;

    public ProfessionalMercadoPagoConnectionController(
        ProfessionalPaymentProviderConnectionService connectionService,
        RoleGuard roleGuard
    ) {
        this.connectionService = connectionService;
        this.roleGuard = roleGuard;
    }

    @GetMapping("/connection")
    public ProfessionalPaymentProviderConnectionResponse getConnection() {
        return connectionService.getMercadoPagoConnection(roleGuard.requireProfessional());
    }

    @PostMapping("/oauth/start")
    public MercadoPagoOAuthStartResponse startOAuth() {
        return connectionService.startMercadoPagoOAuth(roleGuard.requireProfessional());
    }

    @GetMapping("/oauth/callback")
    public ProfessionalPaymentProviderConnectionResponse handleOAuthCallback(
        @RequestParam(value = "code", required = false) String code,
        @RequestParam(value = "state", required = false) String state,
        @RequestParam(value = "error", required = false) String error,
        @RequestParam(value = "error_description", required = false) String errorDescription
    ) {
        return connectionService.handleMercadoPagoOAuthCallback(
            roleGuard.requireProfessional(),
            code,
            state,
            error,
            errorDescription
        );
    }

    @DeleteMapping("/connection")
    public ProfessionalPaymentProviderConnectionResponse disconnect() {
        return connectionService.disconnectMercadoPagoConnection(roleGuard.requireProfessional());
    }
}

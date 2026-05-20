package com.plura.plurabackend.core.billing;

import com.plura.plurabackend.core.billing.dto.ProfessionalRegistrationCheckoutRequest;
import com.plura.plurabackend.core.billing.dto.ProfessionalRegistrationCheckoutResponse;
import com.plura.plurabackend.core.billing.dto.ProfessionalRegistrationCheckoutVerifyRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/billing/professional-registration")
public class ProfessionalRegistrationBillingController {

    private final ProfessionalRegistrationCheckoutService professionalRegistrationCheckoutService;

    public ProfessionalRegistrationBillingController(
        ProfessionalRegistrationCheckoutService professionalRegistrationCheckoutService
    ) {
        this.professionalRegistrationCheckoutService = professionalRegistrationCheckoutService;
    }

    @PostMapping("/checkout")
    public ProfessionalRegistrationCheckoutResponse startCheckout(
        @Valid @RequestBody ProfessionalRegistrationCheckoutRequest request
    ) {
        return professionalRegistrationCheckoutService.startCheckout(request);
    }

    @PostMapping("/verify")
    public ProfessionalRegistrationCheckoutResponse verifyCheckout(
        @Valid @RequestBody ProfessionalRegistrationCheckoutVerifyRequest request
    ) {
        return professionalRegistrationCheckoutService.verifyCheckout(
            request.getCheckoutToken(),
            request.getCheckoutRef()
        );
    }
}

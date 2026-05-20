package com.plura.plurabackend.core.billing.dto;

<<<<<<< HEAD
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
=======
>>>>>>> b06abbb4 (arreglando registro de profesional con mercado pago)
import lombok.Data;

@Data
public class ProfessionalRegistrationCheckoutVerifyRequest {

    private String checkoutToken;
<<<<<<< HEAD

    @Size(max = 128)
    private String providerSubscriptionId;
=======
    private String checkoutRef;
>>>>>>> b06abbb4 (arreglando registro de profesional con mercado pago)
}

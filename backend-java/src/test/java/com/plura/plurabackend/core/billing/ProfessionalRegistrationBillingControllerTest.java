package com.plura.plurabackend.core.billing;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.billing.dto.ProfessionalRegistrationCheckoutRequest;
import com.plura.plurabackend.core.billing.dto.ProfessionalRegistrationCheckoutResponse;
import com.plura.plurabackend.core.billing.dto.ProfessionalRegistrationCheckoutVerifyRequest;
import java.lang.reflect.Method;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@ExtendWith(MockitoExtension.class)
class ProfessionalRegistrationBillingControllerTest {

    @Mock
    private ProfessionalRegistrationCheckoutService professionalRegistrationCheckoutService;

    private ProfessionalRegistrationBillingController controller;

    @BeforeEach
    void setUp() {
        controller = new ProfessionalRegistrationBillingController(professionalRegistrationCheckoutService);
    }

    @Test
    void exposesVersionedProfessionalRegistrationRoutes() throws NoSuchMethodException {
        RequestMapping controllerMapping = ProfessionalRegistrationBillingController.class.getAnnotation(RequestMapping.class);
        assertNotNull(controllerMapping);
        assertArrayEquals(
            new String[] { "/api/v1/billing/professional-registration" },
            controllerMapping.value()
        );

        Method checkout = ProfessionalRegistrationBillingController.class.getMethod(
            "startCheckout",
            ProfessionalRegistrationCheckoutRequest.class
        );
        PostMapping checkoutMapping = checkout.getAnnotation(PostMapping.class);
        assertNotNull(checkoutMapping);
        assertArrayEquals(new String[] { "/checkout" }, checkoutMapping.value());

        Method verify = ProfessionalRegistrationBillingController.class.getMethod(
            "verifyCheckout",
            ProfessionalRegistrationCheckoutVerifyRequest.class
        );
        PostMapping verifyMapping = verify.getAnnotation(PostMapping.class);
        assertNotNull(verifyMapping);
        assertArrayEquals(new String[] { "/verify" }, verifyMapping.value());
    }

    @Test
    void checkoutDelegatesToService() {
        ProfessionalRegistrationCheckoutRequest request = new ProfessionalRegistrationCheckoutRequest();
        request.setPlanCode("PLAN_CORE");
        request.setEmail("unit@plura.com");
        request.setReturnUrl("https://app.test/profesional/auth/register");
        ProfessionalRegistrationCheckoutResponse response = response(false);

        when(professionalRegistrationCheckoutService.startCheckout(request)).thenReturn(response);

        ProfessionalRegistrationCheckoutResponse result = controller.startCheckout(request);

        assertSame(response, result);
        verify(professionalRegistrationCheckoutService).startCheckout(request);
    }

    @Test
    void verifyDelegatesTokenAndRefToService() {
        ProfessionalRegistrationCheckoutVerifyRequest request = new ProfessionalRegistrationCheckoutVerifyRequest();
        request.setCheckoutToken("checkout-token");
        request.setCheckoutRef("checkout-ref");
        ProfessionalRegistrationCheckoutResponse response = response(true);

        when(professionalRegistrationCheckoutService.verifyCheckout("checkout-token", "checkout-ref"))
            .thenReturn(response);

        ProfessionalRegistrationCheckoutResponse result = controller.verifyCheckout(request);

        assertSame(response, result);
        verify(professionalRegistrationCheckoutService).verifyCheckout("checkout-token", "checkout-ref");
    }

    private ProfessionalRegistrationCheckoutResponse response(boolean confirmed) {
        return new ProfessionalRegistrationCheckoutResponse(
            "https://checkout.test",
            "checkout-token",
            "checkout-ref",
            "MERCADOPAGO",
            "PLAN_CORE",
            confirmed ? "ACTIVE" : "CHECKOUT_PENDING",
            null,
            null,
            true,
            confirmed
        );
    }
}

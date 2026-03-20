package com.plura.plurabackend.professional.paymentprovider;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.plura.plurabackend.core.billing.providerconnection.ProfessionalPaymentProviderConnectionService;
import com.plura.plurabackend.core.billing.providerconnection.mercadopago.MercadoPagoOAuthStateService;
import com.plura.plurabackend.core.security.RoleGuard;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:professional-mercadopago-callback-security;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-professional-mercadopago-callback",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-for-professional-mercadopago-callback",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
    "APP_PUBLIC_WEB_URL=https://plura-web.onrender.com"
})
@AutoConfigureMockMvc
class ProfessionalMercadoPagoConnectionSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProfessionalPaymentProviderConnectionService connectionService;

    @MockBean
    private MercadoPagoOAuthStateService mercadoPagoOAuthStateService;

    @MockBean
    private RoleGuard roleGuard;

    @Test
    void callbackShouldAllowAnonymousAccessAndRedirectFrontend() throws Exception {
        when(mercadoPagoOAuthStateService.resolveProfessionalId("state-1"))
            .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth invalido"));

        mockMvc.perform(get("/profesional/payment-providers/mercadopago/oauth/callback")
                .param("state", "state-1"))
            .andExpect(status().isFound())
            .andExpect(header().string(
                "Location",
                "https://plura-web.onrender.com/oauth/mercadopago/callback?result=error&reason=state_invalid"
            ));
    }
}

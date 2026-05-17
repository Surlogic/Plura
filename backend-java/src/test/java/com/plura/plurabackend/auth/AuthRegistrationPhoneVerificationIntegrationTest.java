package com.plura.plurabackend.auth;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.auth.VonageVerifyClient;
import com.plura.plurabackend.core.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-auth-registration-phone-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-registration-phone-flow",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-for-registration-phone-flow",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "AUTH_REGISTRATION_PHONE_VERIFICATION_REQUIRED=true",
    "VONAGE_VERIFY_ENABLED=true",
    "VONAGE_API_KEY=test-api-key",
    "VONAGE_API_SECRET=test-api-secret",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
})
@AutoConfigureMockMvc
class AuthRegistrationPhoneVerificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    private VonageVerifyClient vonageVerifyClient;

    @BeforeEach
    void cleanUp() {
        userRepository.deleteAll();
    }

    @Test
    void verifiedPhoneTokenAllowsRegistrationAndMarksPhoneVerified() throws Exception {
        when(vonageVerifyClient.startSmsVerification(eq("+59899123456"))).thenReturn("req-123");
        when(vonageVerifyClient.checkSmsVerification(eq("req-123"), eq("123456"))).thenReturn(true);

        mockMvc.perform(post("/auth/register/phone/send")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"phoneNumber":"+59899123456"}
                    """))
            .andExpect(status().isAccepted());
        verify(vonageVerifyClient).startSmsVerification("+59899123456");

        String confirmBody = mockMvc.perform(post("/auth/register/phone/confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"phoneNumber":"+59899123456","code":"123456"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.verificationToken").isString())
            .andReturn()
            .getResponse()
            .getContentAsString();
        JsonNode confirmPayload = objectMapper.readTree(confirmBody);

        mockMvc.perform(post("/auth/register/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName":"Cliente Verificado",
                      "email":"verified-phone@plura.com",
                      "phoneNumber":"+59899123456",
                      "phoneVerificationToken":"%s",
                      "password":"Password123"
                    }
                    """.formatted(confirmPayload.path("verificationToken").asText())))
            .andExpect(status().isAccepted());

        org.junit.jupiter.api.Assertions.assertNotNull(
            userRepository.findByEmail("verified-phone@plura.com").orElseThrow().getPhoneVerifiedAt()
        );
    }

    @Test
    void registrationRequiresPhoneVerificationWhenEnabled() throws Exception {
        mockMvc.perform(post("/auth/register/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName":"Cliente Sin Token",
                      "email":"missing-token@plura.com",
                      "phoneNumber":"+59899123457",
                      "password":"Password123"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("PHONE_VERIFICATION_REQUIRED"));
    }
}

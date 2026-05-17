package com.plura.plurabackend.core.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.auth.repository.AuthSessionRepository;
import com.plura.plurabackend.core.auth.repository.PhoneVerificationChallengeRepository;
import com.plura.plurabackend.core.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Tests de autenticacion, sesiones, OTP y recuperacion de cuenta.
 * Cubren escenarios de auth telefono verification integracion para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-auth-phone-verification-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-phone-verification-flow",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-for-phone-verification-flow",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "AUTH_EXPOSE_ACCESS_TOKEN=true",
    "AUTH_PHONE_VERIFICATION_TTL_MINUTES=10",
    "AUTH_PHONE_VERIFICATION_COOLDOWN_SECONDS=60",
    "AUTH_PHONE_VERIFICATION_MAX_ATTEMPTS=3",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
})
@AutoConfigureMockMvc
class AuthPhoneVerificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthSessionRepository authSessionRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PhoneVerificationChallengeRepository phoneVerificationChallengeRepository;

    @MockBean
    private VonageVerifyClient vonageVerifyClient;

    /**
     * Prepara mocks, datos base o configuracion comun antes de cada caso de prueba.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @BeforeEach
    void cleanUp() {
        phoneVerificationChallengeRepository.deleteAll();
        authSessionRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    /**
     * Escenario: send y confirm telefono verification code marca usuario como verified.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void sendAndConfirmPhoneVerificationCodeMarksUserAsVerified() throws Exception {
        registerClient("verify-phone@plura.com", "+59812345678", "Password123");
        JsonNode loginPayload = loginClient("verify-phone@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();
        when(vonageVerifyClient.startSmsVerification(eq("+59812345678"))).thenReturn("req-verify-phone");
        when(vonageVerifyClient.checkSmsVerification(eq("req-verify-phone"), eq("123456"))).thenReturn(true);

        mockMvc.perform(post("/auth/verify/phone/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.message").value("Te enviamos un código de verificación por SMS."));

        mockMvc.perform(post("/auth/verify/phone/confirm")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "code": "123456"
                    }
                    """))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/auth/me/cliente")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.phoneVerified").value(true));

        User updated = userRepository.findByEmail("verify-phone@plura.com").orElseThrow();
        Assertions.assertNotNull(updated.getPhoneVerifiedAt());
    }

    /**
     * Escenario: resend within cooldown verifica que devuelva cooldown sin creating nuevo challenge.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void resendWithinCooldownReturnsCooldownWithoutCreatingNewChallenge() throws Exception {
        registerClient("cooldown-phone@plura.com", "+59811112222", "Password123");
        JsonNode loginPayload = loginClient("cooldown-phone@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();
        when(vonageVerifyClient.startSmsVerification(eq("+59811112222"))).thenReturn("req-cooldown");

        mockMvc.perform(post("/auth/verify/phone/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted());

        mockMvc.perform(post("/auth/verify/phone/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.cooldownSeconds").isNumber());

        Assertions.assertEquals(1L, phoneVerificationChallengeRepository.count());
        verify(vonageVerifyClient, times(1)).startSmsVerification("+59811112222");
    }

    /**
     * Escenario: confirm wrong code eventually exceeds attempts y persists attempt conteo.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void confirmWrongCodeEventuallyExceedsAttemptsAndPersistsAttemptCount() throws Exception {
        registerClient("attempts-phone@plura.com", "+59833334444", "Password123");
        JsonNode loginPayload = loginClient("attempts-phone@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();
        when(vonageVerifyClient.startSmsVerification(eq("+59833334444"))).thenReturn("req-attempts");

        mockMvc.perform(post("/auth/verify/phone/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted());

        mockMvc.perform(post("/auth/verify/phone/confirm")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"000000\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("CODE_INVALID"));

        mockMvc.perform(post("/auth/verify/phone/confirm")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"111111\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("CODE_INVALID"));

        mockMvc.perform(post("/auth/verify/phone/confirm")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"222222\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("ATTEMPTS_EXCEEDED"));

        Assertions.assertEquals(
            3,
            phoneVerificationChallengeRepository.findTopByUser_IdOrderByCreatedAtDesc(
                userRepository.findByEmail("attempts-phone@plura.com").orElseThrow().getId()
            ).orElseThrow().getAttemptCount()
        );
    }

    /**
     * Escenario: vencido code verifica que devuelva code vencido.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void expiredCodeReturnsCodeExpired() throws Exception {
        registerClient("expired-phone@plura.com", "+59855556666", "Password123");
        JsonNode loginPayload = loginClient("expired-phone@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();
        when(vonageVerifyClient.startSmsVerification(eq("+59855556666"))).thenReturn("req-expired");

        mockMvc.perform(post("/auth/verify/phone/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted());

        User user = userRepository.findByEmail("expired-phone@plura.com").orElseThrow();
        var challenge = phoneVerificationChallengeRepository.findTopByUser_IdOrderByCreatedAtDesc(user.getId()).orElseThrow();
        challenge.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        phoneVerificationChallengeRepository.save(challenge);

        mockMvc.perform(post("/auth/verify/phone/confirm")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"123456\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("CODE_EXPIRED"));
    }

    /**
     * Escenario: already verified usuario does no get nuevo challenge.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void alreadyVerifiedUserDoesNotGetNewChallenge() throws Exception {
        registerClient("already-phone@plura.com", "+59877778888", "Password123");
        User user = userRepository.findByEmail("already-phone@plura.com").orElseThrow();
        user.setPhoneVerifiedAt(LocalDateTime.now());
        userRepository.save(user);
        JsonNode loginPayload = loginClient("already-phone@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();

        mockMvc.perform(post("/auth/verify/phone/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.message").value("El teléfono ya está verificado."));

        verify(vonageVerifyClient, never()).startSmsVerification(any());
        Assertions.assertEquals(0L, phoneVerificationChallengeRepository.count());
    }

    /**
     * Escenario: send sin telefono verifica que devuelva telefono faltante.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void sendWithoutPhoneReturnsPhoneMissing() throws Exception {
        registerClient("missing-phone@plura.com", "+59899990000", "Password123");
        User user = userRepository.findByEmail("missing-phone@plura.com").orElseThrow();
        user.setPhoneNumber(null);
        userRepository.save(user);
        JsonNode loginPayload = loginClient("missing-phone@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();

        mockMvc.perform(post("/auth/verify/phone/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("PHONE_MISSING"));
    }

    private void registerClient(String email, String phoneNumber, String password) throws Exception {
        mockMvc.perform(post("/auth/register/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Test User",
                      "email": "%s",
                      "phoneNumber": "%s",
                      "password": "%s"
                    }
                    """.formatted(email, phoneNumber, password)))
            .andExpect(status().isAccepted());
    }

    private JsonNode loginClient(String email, String password) throws Exception {
        String payload = mockMvc.perform(post("/auth/login/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "%s",
                      "password": "%s"
                    }
                    """.formatted(email, password)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        return objectMapper.readTree(payload);
    }
}

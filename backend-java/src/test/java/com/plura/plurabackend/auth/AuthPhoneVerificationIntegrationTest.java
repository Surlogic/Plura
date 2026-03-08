package com.plura.plurabackend.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.auth.repository.AuthSessionRepository;
import com.plura.plurabackend.auth.repository.PhoneVerificationChallengeRepository;
import com.plura.plurabackend.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.repository.UserRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

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
    private PhoneVerificationNotificationSender phoneVerificationNotificationSender;

    @BeforeEach
    void cleanUp() {
        phoneVerificationChallengeRepository.deleteAll();
        authSessionRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void sendAndConfirmPhoneVerificationCodeMarksUserAsVerified() throws Exception {
        registerClient("verify-phone@plura.com", "+59812345678", "Password123");
        JsonNode loginPayload = loginClient("verify-phone@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();

        mockMvc.perform(post("/auth/verify/phone/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.message").value("Te enviamos un código de verificación por SMS."));

        ArgumentCaptor<PhoneVerificationNotificationSender.PhoneVerificationNotification> captor =
            ArgumentCaptor.forClass(PhoneVerificationNotificationSender.PhoneVerificationNotification.class);
        verify(phoneVerificationNotificationSender, times(1)).sendVerificationCode(captor.capture());

        mockMvc.perform(post("/auth/verify/phone/confirm")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "code": "%s"
                    }
                    """.formatted(captor.getValue().code())))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/auth/me/cliente")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.phoneVerified").value(true));

        User updated = userRepository.findByEmail("verify-phone@plura.com").orElseThrow();
        Assertions.assertNotNull(updated.getPhoneVerifiedAt());
    }

    @Test
    void resendWithinCooldownReturnsCooldownWithoutCreatingNewChallenge() throws Exception {
        registerClient("cooldown-phone@plura.com", "+59811112222", "Password123");
        JsonNode loginPayload = loginClient("cooldown-phone@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();

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
        verify(phoneVerificationNotificationSender, times(1)).sendVerificationCode(any());
    }

    @Test
    void confirmWrongCodeEventuallyExceedsAttemptsAndPersistsAttemptCount() throws Exception {
        registerClient("attempts-phone@plura.com", "+59833334444", "Password123");
        JsonNode loginPayload = loginClient("attempts-phone@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();

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

    @Test
    void expiredCodeReturnsCodeExpired() throws Exception {
        registerClient("expired-phone@plura.com", "+59855556666", "Password123");
        JsonNode loginPayload = loginClient("expired-phone@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();

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

        verify(phoneVerificationNotificationSender, never()).sendVerificationCode(any());
        Assertions.assertEquals(0L, phoneVerificationChallengeRepository.count());
    }

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

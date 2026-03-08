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
import com.plura.plurabackend.auth.repository.EmailVerificationChallengeRepository;
import com.plura.plurabackend.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.repository.UserRepository;
import java.time.LocalDateTime;
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
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-auth-email-verification-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-email-verification-flow",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-for-email-verification-flow",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "AUTH_EXPOSE_ACCESS_TOKEN=true",
    "AUTH_EMAIL_VERIFICATION_TTL_MINUTES=15",
    "AUTH_EMAIL_VERIFICATION_COOLDOWN_SECONDS=60",
    "AUTH_EMAIL_VERIFICATION_MAX_ATTEMPTS=3",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
})
@AutoConfigureMockMvc
class AuthEmailVerificationIntegrationTest {

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
    private EmailVerificationChallengeRepository emailVerificationChallengeRepository;

    @MockBean
    private EmailVerificationNotificationSender emailVerificationNotificationSender;

    @BeforeEach
    void cleanUp() {
        emailVerificationChallengeRepository.deleteAll();
        authSessionRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void sendAndConfirmEmailVerificationCodeMarksUserAsVerified() throws Exception {
        registerClient("verify-email@plura.com", "Password123");
        JsonNode loginPayload = loginClient("verify-email@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();

        mockMvc.perform(post("/auth/verify/email/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.message").value("Te enviamos un código de verificación por email."));

        ArgumentCaptor<EmailVerificationNotificationSender.EmailVerificationNotification> captor =
            ArgumentCaptor.forClass(EmailVerificationNotificationSender.EmailVerificationNotification.class);
        verify(emailVerificationNotificationSender, times(1)).sendVerificationCode(captor.capture());

        mockMvc.perform(post("/auth/verify/email/confirm")
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
            .andExpect(jsonPath("$.emailVerified").value(true));

        User updated = userRepository.findByEmail("verify-email@plura.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertNotNull(updated.getEmailVerifiedAt());
    }

    @Test
    void resendWithinCooldownReturnsCooldownWithoutCreatingNewChallenge() throws Exception {
        registerClient("cooldown-email@plura.com", "Password123");
        JsonNode loginPayload = loginClient("cooldown-email@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();

        mockMvc.perform(post("/auth/verify/email/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted());

        mockMvc.perform(post("/auth/verify/email/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.cooldownSeconds").isNumber());

        org.junit.jupiter.api.Assertions.assertEquals(1L, emailVerificationChallengeRepository.count());
        verify(emailVerificationNotificationSender, times(1)).sendVerificationCode(any());
    }

    @Test
    void confirmWrongCodeEventuallyExceedsAttempts() throws Exception {
        registerClient("attempts-email@plura.com", "Password123");
        JsonNode loginPayload = loginClient("attempts-email@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();

        mockMvc.perform(post("/auth/verify/email/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted());

        mockMvc.perform(post("/auth/verify/email/confirm")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"000000\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("CODE_INVALID"));

        mockMvc.perform(post("/auth/verify/email/confirm")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"111111\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("CODE_INVALID"));

        mockMvc.perform(post("/auth/verify/email/confirm")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"222222\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("ATTEMPTS_EXCEEDED"));
    }

    @Test
    void alreadyVerifiedUserDoesNotGetNewChallenge() throws Exception {
        registerClient("already-verified@plura.com", "Password123");
        User user = userRepository.findByEmail("already-verified@plura.com").orElseThrow();
        user.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(user);
        JsonNode loginPayload = loginClient("already-verified@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();

        mockMvc.perform(post("/auth/verify/email/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.message").value("El email ya está verificado."));

        verify(emailVerificationNotificationSender, never()).sendVerificationCode(any());
        org.junit.jupiter.api.Assertions.assertEquals(0L, emailVerificationChallengeRepository.count());
    }

    private void registerClient(String email, String password) throws Exception {
        mockMvc.perform(post("/auth/register/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Test User",
                      "email": "%s",
                      "phoneNumber": "+59812345678",
                      "password": "%s"
                    }
                    """.formatted(email, password)))
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

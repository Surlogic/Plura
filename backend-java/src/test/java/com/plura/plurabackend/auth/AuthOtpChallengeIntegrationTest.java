package com.plura.plurabackend.core.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.auth.model.AuthAuditEventType;
import com.plura.plurabackend.core.auth.repository.AuthAuditLogRepository;
import com.plura.plurabackend.core.auth.repository.AuthOtpChallengeRepository;
import com.plura.plurabackend.core.auth.repository.AuthSessionRepository;
import com.plura.plurabackend.core.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.core.user.repository.UserRepository;
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
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-auth-otp-challenge-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-otp-challenge",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-for-otp-challenge",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "AUTH_EXPOSE_ACCESS_TOKEN=true",
    "AUTH_OTP_CHALLENGE_TTL_MINUTES=10",
    "AUTH_OTP_CHALLENGE_COOLDOWN_SECONDS=60",
    "AUTH_OTP_CHALLENGE_MAX_ATTEMPTS=3",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
})
@AutoConfigureMockMvc
class AuthOtpChallengeIntegrationTest {

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
    private AuthOtpChallengeRepository authOtpChallengeRepository;

    @Autowired
    private AuthAuditLogRepository authAuditLogRepository;

    @MockBean
    private OtpChallengeNotificationSender otpChallengeNotificationSender;

    @BeforeEach
    void cleanUp() {
        authAuditLogRepository.deleteAll();
        authOtpChallengeRepository.deleteAll();
        authSessionRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void sendAndVerifyChallengePersistsAuditAndChallengeFlow() throws Exception {
        registerClient();
        String accessToken = loginClient();

        mockMvc.perform(post("/auth/challenge/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "purpose": "ACCOUNT_DELETION",
                      "channel": "EMAIL"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.challengeId").isNotEmpty())
            .andExpect(jsonPath("$.maskedDestination").exists());

        ArgumentCaptor<OtpChallengeNotificationSender.OtpChallengeNotification> captor =
            ArgumentCaptor.forClass(OtpChallengeNotificationSender.OtpChallengeNotification.class);
        verify(otpChallengeNotificationSender, atLeastOnce()).sendChallenge(captor.capture());

        mockMvc.perform(post("/auth/challenge/verify")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "challengeId": "%s",
                      "code": "%s"
                    }
                    """.formatted(
                    authOtpChallengeRepository.findAll().stream().findFirst().orElseThrow().getId(),
                    captor.getAllValues().get(captor.getAllValues().size() - 1).code()
                )))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.verified").value(true));

        Assertions.assertTrue(authAuditLogRepository.findAll().stream()
            .anyMatch(log -> log.getEventType() == AuthAuditEventType.OTP_CHALLENGE_SENT));
        Assertions.assertTrue(authAuditLogRepository.findAll().stream()
            .anyMatch(log -> log.getEventType() == AuthAuditEventType.OTP_CHALLENGE_VERIFIED));
    }

    @Test
    void deleteAccountWithoutChallengeReturnsChallengeRequired() throws Exception {
        registerClient();
        String accessToken = loginClient();

        mockMvc.perform(delete("/auth/me")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("CHALLENGE_REQUIRED"));
    }

    private void registerClient() throws Exception {
        mockMvc.perform(post("/auth/register/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Cliente Demo",
                      "email": "otp-client@plura.com",
                      "phoneNumber": "+5491111111111",
                      "password": "Password123"
                    }
                    """))
            .andExpect(status().isAccepted());
    }

    private String loginClient() throws Exception {
        String payload = mockMvc.perform(post("/auth/login/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "otp-client@plura.com",
                      "password": "Password123"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        JsonNode json = objectMapper.readTree(payload);
        return json.path("accessToken").asText();
    }
}

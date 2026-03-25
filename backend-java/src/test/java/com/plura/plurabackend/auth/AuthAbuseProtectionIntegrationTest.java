package com.plura.plurabackend.core.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.auth.model.AuthAuditEventType;
import com.plura.plurabackend.core.auth.model.AuthAuditLog;
import com.plura.plurabackend.core.auth.repository.AuthAuditLogRepository;
import com.plura.plurabackend.core.auth.repository.AuthOtpChallengeRepository;
import com.plura.plurabackend.core.auth.repository.AuthSessionRepository;
import com.plura.plurabackend.core.auth.repository.EmailVerificationChallengeRepository;
import com.plura.plurabackend.core.auth.repository.PasswordResetTokenRepository;
import com.plura.plurabackend.core.auth.repository.PhoneVerificationChallengeRepository;
import com.plura.plurabackend.core.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-abuse-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-abuse",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-abuse",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=true",
    "AUTH_EXPOSE_ACCESS_TOKEN=true",
    "app.auth.abuse.refresh.max-per-user=4",
    "app.auth.abuse.refresh.max-per-ip=4",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
})
@AutoConfigureMockMvc
class AuthAbuseProtectionIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private RefreshTokenRepository refreshTokenRepository;
    @Autowired private AuthSessionRepository authSessionRepository;
    @Autowired private AuthAuditLogRepository authAuditLogRepository;
    @Autowired private EmailVerificationChallengeRepository emailVerificationChallengeRepository;
    @Autowired private PhoneVerificationChallengeRepository phoneVerificationChallengeRepository;
    @Autowired private AuthOtpChallengeRepository authOtpChallengeRepository;
    @Autowired private PasswordResetTokenRepository passwordResetTokenRepository;

    @BeforeEach
    void cleanUp() {
        authAuditLogRepository.deleteAll();
        authOtpChallengeRepository.deleteAll();
        emailVerificationChallengeRepository.deleteAll();
        phoneVerificationChallengeRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        authSessionRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    // --- Login rate limiting ---

    @Test
    void loginRateLimitBlocksAfterExcessiveFailures() throws Exception {
        registerClient("login-rl@plura.com");

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/auth/login/cliente")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"email":"login-rl@plura.com","password":"WrongPass%d"}
                        """.formatted(i)))
                .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/auth/login/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"login-rl@plura.com","password":"Password123"}
                    """))
            .andExpect(status().isTooManyRequests());

        List<AuthAuditLog> rateLimitLogs = authAuditLogRepository.findAll().stream()
            .filter(log -> log.getEventType() == AuthAuditEventType.LOGIN_RATE_LIMITED)
            .toList();
        assertFalse(rateLimitLogs.isEmpty(), "LOGIN_RATE_LIMITED audit event should be logged");
    }

    // --- Forgot password rate limiting ---

    @Test
    void forgotPasswordRateLimitBlocksAfterExcessiveAttempts() throws Exception {
        for (int i = 0; i < 6; i++) {
            mockMvc.perform(post("/auth/password/forgot")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"email":"forgot-rl@plura.com"}
                        """));
        }

        mockMvc.perform(post("/auth/password/forgot")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"forgot-rl@plura.com"}
                    """))
            .andExpect(status().isTooManyRequests());

        List<AuthAuditLog> rateLimitLogs = authAuditLogRepository.findAll().stream()
            .filter(log -> log.getEventType() == AuthAuditEventType.FORGOT_PASSWORD_RATE_LIMITED)
            .toList();
        assertFalse(rateLimitLogs.isEmpty(), "FORGOT_PASSWORD_RATE_LIMITED audit event should be logged");
    }

    // --- Register rate limiting ---

    @Test
    void registerRateLimitBlocksAfterExcessiveAttempts() throws Exception {
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/auth/register/cliente")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"fullName":"Test","email":"register-rl@plura.com","phoneNumber":"+59899%06d","password":"Password123"}
                        """.formatted(i)));
        }

        mockMvc.perform(post("/auth/register/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"fullName":"Test","email":"register-rl@plura.com","phoneNumber":"+598991234567","password":"Password123"}
                    """))
            .andExpect(status().isTooManyRequests());

        List<AuthAuditLog> rateLimitLogs = authAuditLogRepository.findAll().stream()
            .filter(log -> log.getEventType() == AuthAuditEventType.REGISTER_RATE_LIMITED)
            .toList();
        assertFalse(rateLimitLogs.isEmpty(), "REGISTER_RATE_LIMITED audit event should be logged");
    }

    // --- Verify email send rate limiting ---

    @Test
    void verifyEmailSendRateLimitBlocksAfterExcessiveAttempts() throws Exception {
        registerClient("verify-email-rl@plura.com");
        String accessToken = loginAndGetAccessToken("verify-email-rl@plura.com");

        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/auth/verify/email/send")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"));
        }

        mockMvc.perform(post("/auth/verify/email/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isTooManyRequests());

        assertTrue(
            authAuditLogRepository.findAll().stream()
                .anyMatch(log -> log.getEventType() == AuthAuditEventType.EMAIL_VERIFICATION_SEND_RATE_LIMITED),
            "EMAIL_VERIFICATION_SEND_RATE_LIMITED audit event should be logged"
        );
    }

    // --- Verify email confirm rate limiting ---

    @Test
    void verifyEmailConfirmRateLimitBlocksAfterExcessiveAttempts() throws Exception {
        registerClient("verify-email-confirm-rl@plura.com");
        String accessToken = loginAndGetAccessToken("verify-email-confirm-rl@plura.com");

        for (int i = 0; i < 6; i++) {
            mockMvc.perform(post("/auth/verify/email/confirm")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"code":"000000"}
                        """));
        }

        mockMvc.perform(post("/auth/verify/email/confirm")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"code":"000000"}
                    """))
            .andExpect(status().isTooManyRequests());

        assertTrue(
            authAuditLogRepository.findAll().stream()
                .anyMatch(log -> log.getEventType() == AuthAuditEventType.EMAIL_VERIFICATION_CONFIRM_RATE_LIMITED),
            "EMAIL_VERIFICATION_CONFIRM_RATE_LIMITED audit event should be logged"
        );
    }

    // --- Verify phone send rate limiting ---

    @Test
    void verifyPhoneSendRateLimitBlocksAfterExcessiveAttempts() throws Exception {
        registerClient("verify-phone-rl@plura.com");
        String accessToken = loginAndGetAccessToken("verify-phone-rl@plura.com");

        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/auth/verify/phone/send")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"));
        }

        mockMvc.perform(post("/auth/verify/phone/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isTooManyRequests());

        assertTrue(
            authAuditLogRepository.findAll().stream()
                .anyMatch(log -> log.getEventType() == AuthAuditEventType.PHONE_VERIFICATION_SEND_RATE_LIMITED),
            "PHONE_VERIFICATION_SEND_RATE_LIMITED audit event should be logged"
        );
    }

    // --- Verify phone confirm rate limiting ---

    @Test
    void verifyPhoneConfirmRateLimitBlocksAfterExcessiveAttempts() throws Exception {
        registerClient("verify-phone-confirm-rl@plura.com");
        String accessToken = loginAndGetAccessToken("verify-phone-confirm-rl@plura.com");

        for (int i = 0; i < 6; i++) {
            mockMvc.perform(post("/auth/verify/phone/confirm")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"code":"000000"}
                        """));
        }

        mockMvc.perform(post("/auth/verify/phone/confirm")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"code":"000000"}
                    """))
            .andExpect(status().isTooManyRequests());

        assertTrue(
            authAuditLogRepository.findAll().stream()
                .anyMatch(log -> log.getEventType() == AuthAuditEventType.PHONE_VERIFICATION_CONFIRM_RATE_LIMITED),
            "PHONE_VERIFICATION_CONFIRM_RATE_LIMITED audit event should be logged"
        );
    }

    // --- Challenge send rate limiting ---

    @Test
    void challengeSendRateLimitBlocksAfterExcessiveAttempts() throws Exception {
        registerClient("challenge-send-rl@plura.com");
        String accessToken = loginAndGetAccessToken("challenge-send-rl@plura.com");

        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/auth/challenge/send")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"purpose":"ACCOUNT_DELETION","channel":"EMAIL"}
                        """));
        }

        mockMvc.perform(post("/auth/challenge/send")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"purpose":"ACCOUNT_DELETION","channel":"EMAIL"}
                    """))
            .andExpect(status().isTooManyRequests());

        assertTrue(
            authAuditLogRepository.findAll().stream()
                .anyMatch(log -> log.getEventType() == AuthAuditEventType.CHALLENGE_SEND_RATE_LIMITED),
            "CHALLENGE_SEND_RATE_LIMITED audit event should be logged"
        );
    }

    // --- Challenge verify rate limiting ---

    @Test
    void challengeVerifyRateLimitBlocksAfterExcessiveAttempts() throws Exception {
        registerClient("challenge-verify-rl@plura.com");
        String accessToken = loginAndGetAccessToken("challenge-verify-rl@plura.com");

        for (int i = 0; i < 6; i++) {
            mockMvc.perform(post("/auth/challenge/verify")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"challengeId":"fake-challenge-id","code":"000000"}
                        """));
        }

        mockMvc.perform(post("/auth/challenge/verify")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"challengeId":"fake-challenge-id","code":"000000"}
                    """))
            .andExpect(status().isTooManyRequests());

        assertTrue(
            authAuditLogRepository.findAll().stream()
                .anyMatch(log -> log.getEventType() == AuthAuditEventType.CHALLENGE_VERIFY_RATE_LIMITED),
            "CHALLENGE_VERIFY_RATE_LIMITED audit event should be logged"
        );
    }

    // --- Refresh does not get accidentally blocked ---

    @Test
    void refreshIsNotAccidentallyBlockedByRateLimit() throws Exception {
        registerClient("refresh-safe@plura.com");
        String accessToken = loginAndGetAccessToken("refresh-safe@plura.com");
        String refreshToken = loginAndGetRefreshToken("refresh-safe@plura.com");

        MvcResult result = mockMvc.perform(post("/auth/refresh")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"refreshToken":"%s"}
                    """.formatted(refreshToken)))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode payload = objectMapper.readTree(result.getResponse().getContentAsString());
        assertNotNull(payload.path("accessToken").asText());
    }

    @Test
    void refreshRateLimitBlocksAfterExcessiveAttempts() throws Exception {
        registerClient("refresh-rl@plura.com");
        String refreshToken = loginAndGetRefreshToken("refresh-rl@plura.com");

        for (int i = 0; i < 3; i++) {
            MvcResult result = mockMvc.perform(post("/auth/refresh")
                    .header("X-Plura-Client-Platform", "MOBILE")
                    .header("X-Plura-Session-Transport", "BODY")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"refreshToken":"%s"}
                        """.formatted(refreshToken)))
                .andExpect(status().isOk())
                .andReturn();
            refreshToken = objectMapper.readTree(result.getResponse().getContentAsString()).path("refreshToken").asText();
        }

        mockMvc.perform(post("/auth/refresh")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"refreshToken":"%s"}
                    """.formatted(refreshToken)))
            .andExpect(status().isTooManyRequests());

        assertTrue(
            authAuditLogRepository.findAll().stream()
                .anyMatch(log -> log.getEventType() == AuthAuditEventType.REFRESH_RATE_LIMITED),
            "REFRESH_RATE_LIMITED audit event should be logged"
        );
    }

    // --- GET /auth/audit returns only events for authenticated user ---

    @Test
    void auditEndpointReturnsOnlyEventsForAuthenticatedUser() throws Exception {
        registerClient("audit-user1@plura.com");
        registerClient("audit-user2@plura.com");

        String accessToken1 = loginAndGetAccessToken("audit-user1@plura.com");
        String accessToken2 = loginAndGetAccessToken("audit-user2@plura.com");

        mockMvc.perform(post("/auth/verify/phone/send")
                .header("Authorization", "Bearer " + accessToken1)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted());

        mockMvc.perform(post("/auth/verify/email/send")
                .header("Authorization", "Bearer " + accessToken2)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isAccepted());

        MvcResult result1 = mockMvc.perform(get("/auth/audit")
                .header("Authorization", "Bearer " + accessToken1))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.events").isArray())
            .andReturn();

        JsonNode events1 = objectMapper.readTree(result1.getResponse().getContentAsString()).path("events");
        assertTrue(containsEvent(events1, AuthAuditEventType.PHONE_VERIFICATION_SENT.name()));
        assertFalse(containsEvent(events1, AuthAuditEventType.EMAIL_VERIFICATION_SENT.name()));

        MvcResult result2 = mockMvc.perform(get("/auth/audit")
                .header("Authorization", "Bearer " + accessToken2))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.events").isArray())
            .andReturn();

        JsonNode events2 = objectMapper.readTree(result2.getResponse().getContentAsString()).path("events");
        assertTrue(containsEvent(events2, AuthAuditEventType.EMAIL_VERIFICATION_SENT.name()));
        assertFalse(containsEvent(events2, AuthAuditEventType.PHONE_VERIFICATION_SENT.name()));
    }

    @Test
    void auditEndpointRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/auth/audit"))
            .andExpect(status().isUnauthorized());
    }

    // --- Differentiated limits: login and forgot password use separate buckets ---

    @Test
    void loginAndForgotPasswordUseSeparateBuckets() throws Exception {
        registerClient("separate-buckets@plura.com");

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/auth/login/cliente")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"email":"separate-buckets@plura.com","password":"WrongPass%d"}
                        """.formatted(i)))
                .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/auth/login/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"separate-buckets@plura.com","password":"Password123"}
                    """))
            .andExpect(status().isTooManyRequests());

        mockMvc.perform(post("/auth/password/forgot")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"separate-buckets@plura.com"}
                    """))
            .andExpect(result ->
                org.junit.jupiter.api.Assertions.assertNotEquals(
                    429,
                    result.getResponse().getStatus()
                )
            );
    }

    // --- Helpers ---

    private void registerClient(String email) throws Exception {
        mockMvc.perform(post("/auth/register/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"fullName":"Test User","email":"%s","phoneNumber":"+5491111111111","password":"Password123"}
                    """.formatted(email)))
            .andExpect(status().isAccepted());
    }

    private String loginAndGetAccessToken(String email) throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/auth/login/cliente")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"%s","password":"Password123"}
                    """.formatted(email)))
            .andExpect(status().isOk())
            .andReturn();
        return objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .path("accessToken").asText();
    }

    private String loginAndGetRefreshToken(String email) throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/auth/login/cliente")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"%s","password":"Password123"}
                    """.formatted(email)))
            .andExpect(status().isOk())
            .andReturn();
        return objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .path("refreshToken").asText();
    }

    private boolean containsEvent(JsonNode events, String eventType) {
        for (JsonNode event : events) {
            if (eventType.equals(event.path("eventType").asText())) {
                return true;
            }
        }
        return false;
    }
}

package com.plura.plurabackend.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.auth.model.AuthAuditEventType;
import com.plura.plurabackend.auth.model.RefreshToken;
import com.plura.plurabackend.auth.repository.AuthAuditLogRepository;
import com.plura.plurabackend.auth.repository.AuthSessionRepository;
import com.plura.plurabackend.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-auth-session-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-session-flow",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-for-session-flow",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "AUTH_EXPOSE_ACCESS_TOKEN=true",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
})
@AutoConfigureMockMvc
class AuthSessionIntegrationTest {

    private static final String JWT_REFRESH_PEPPER = "test-refresh-pepper-for-session-flow";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private AuthSessionRepository authSessionRepository;

    @Autowired
    private AuthAuditLogRepository authAuditLogRepository;

    @BeforeEach
    void cleanUp() {
        authAuditLogRepository.deleteAll();
        authSessionRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void webLoginCreatesSessionAndListsIt() throws Exception {
        registerClient("session-web@plura.com");

        MvcResult loginResult = mockMvc.perform(post("/auth/login/cliente")
                .header("X-Plura-Client-Platform", "WEB")
                .header("X-Plura-Session-Transport", "COOKIE")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "session-web@plura.com",
                      "password": "Password123"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(cookie().exists("plura_refresh_token"))
            .andExpect(jsonPath("$.session.id").isNotEmpty())
            .andExpect(jsonPath("$.session.sessionType").value("WEB"))
            .andReturn();

        JsonNode payload = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String accessToken = payload.path("accessToken").asText();
        String sessionId = payload.path("session").path("id").asText();

        mockMvc.perform(get("/auth/sessions")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sessions[0].id").value(sessionId))
            .andExpect(jsonPath("$.sessions[0].current").value(true));
    }

    @Test
    void mobileRefreshUsesBodyAndRotatesRefreshToken() throws Exception {
        registerClient("session-mobile@plura.com");

        MvcResult loginResult = mockMvc.perform(post("/auth/login/cliente")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "session-mobile@plura.com",
                      "password": "Password123"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.refreshToken").isNotEmpty())
            .andExpect(jsonPath("$.session.sessionType").value("MOBILE"))
            .andReturn();

        JsonNode loginPayload = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String refreshToken = loginPayload.path("refreshToken").asText();

        MvcResult refreshResult = mockMvc.perform(post("/auth/refresh")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .header("Authorization", "Bearer " + loginPayload.path("accessToken").asText())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "refreshToken": "%s"
                    }
                    """.formatted(refreshToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.refreshToken").isNotEmpty())
            .andReturn();

        JsonNode refreshPayload = objectMapper.readTree(refreshResult.getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertNotEquals(refreshToken, refreshPayload.path("refreshToken").asText());
        org.junit.jupiter.api.Assertions.assertEquals(1L, authSessionRepository.count());
    }

    @Test
    void legacyRefreshFallbackMigratesSessionWhenCompatibilityIsEnabled() throws Exception {
        registerClient("legacy-fallback@plura.com");
        User user = userRepository.findByEmailAndDeletedAtIsNull("legacy-fallback@plura.com").orElseThrow();
        String rawRefreshToken = generateOpaqueToken();

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(hashRefresh(rawRefreshToken));
        refreshToken.setExpiryDate(LocalDateTime.now().plusDays(30));
        refreshTokenRepository.save(refreshToken);

        mockMvc.perform(post("/auth/refresh")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "refreshToken": "%s"
                    }
                    """.formatted(rawRefreshToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.refreshToken").isNotEmpty())
            .andExpect(jsonPath("$.session.id").isNotEmpty());

        org.junit.jupiter.api.Assertions.assertEquals(1L, authSessionRepository.count());
    }

    @Test
    void refreshReuseRevokesCompromisedSessionAndAllowsNewCleanLogin() throws Exception {
        registerClient("refresh-reuse@plura.com");

        JsonNode loginPayload = loginMobile("refresh-reuse@plura.com");
        String firstRefreshToken = loginPayload.path("refreshToken").asText();

        MvcResult refreshResult = refreshMobile(firstRefreshToken);
        JsonNode rotatedPayload = objectMapper.readTree(refreshResult.getResponse().getContentAsString());
        String rotatedAccessToken = rotatedPayload.path("accessToken").asText();
        String rotatedRefreshToken = rotatedPayload.path("refreshToken").asText();

        mockMvc.perform(post("/auth/refresh")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "refreshToken": "%s"
                    }
                    """.formatted(firstRefreshToken)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("SESSION_COMPROMISED"));

        mockMvc.perform(post("/auth/refresh")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "refreshToken": "%s"
                    }
                    """.formatted(rotatedRefreshToken)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("SESSION_REVOKED"));

        mockMvc.perform(get("/auth/me/cliente")
                .header("Authorization", "Bearer " + rotatedAccessToken))
            .andExpect(status().isUnauthorized());

        JsonNode reloginPayload = loginMobile("refresh-reuse@plura.com");
        mockMvc.perform(get("/auth/me/cliente")
                .header("Authorization", "Bearer " + reloginPayload.path("accessToken").asText()))
            .andExpect(status().isOk());

        org.junit.jupiter.api.Assertions.assertTrue(authAuditLogRepository.findAll().stream()
            .anyMatch(log -> log.getEventType() == AuthAuditEventType.REFRESH_SUCCESS));
        org.junit.jupiter.api.Assertions.assertTrue(authAuditLogRepository.findAll().stream()
            .anyMatch(log -> log.getEventType() == AuthAuditEventType.REFRESH_TOKEN_REUSE_DETECTED));
        org.junit.jupiter.api.Assertions.assertTrue(authAuditLogRepository.findAll().stream()
            .anyMatch(log -> log.getEventType() == AuthAuditEventType.SESSION_REVOKED_COMPROMISED));
    }

    @Test
    void logoutAllRevokesCurrentAccessTokenBySessionVersion() throws Exception {
        registerClient("logout-all@plura.com");

        MvcResult loginResult = mockMvc.perform(post("/auth/login/cliente")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "logout-all@plura.com",
                      "password": "Password123"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();

        String accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .path("accessToken")
            .asText();

        mockMvc.perform(post("/auth/logout-all")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/auth/me/cliente")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteSessionRevokesOnlyRequestedSession() throws Exception {
        registerClient("delete-session@plura.com");

        MvcResult loginResult = mockMvc.perform(post("/auth/login/cliente")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "delete-session@plura.com",
                      "password": "Password123"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode payload = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String accessToken = payload.path("accessToken").asText();
        String sessionId = payload.path("session").path("id").asText();

        mockMvc.perform(delete("/auth/sessions/{sessionId}", sessionId)
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/auth/me/cliente")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isUnauthorized());
    }

    private void registerClient(String email) throws Exception {
        mockMvc.perform(post("/auth/register/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Cliente Demo",
                      "email": "%s",
                      "phoneNumber": "+5491111111111",
                      "password": "Password123"
                    }
                    """.formatted(email)))
            .andExpect(status().isAccepted());
    }

    private JsonNode loginMobile(String email) throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/auth/login/cliente")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "%s",
                      "password": "Password123"
                    }
                    """.formatted(email)))
            .andExpect(status().isOk())
            .andReturn();
        return objectMapper.readTree(loginResult.getResponse().getContentAsString());
    }

    private MvcResult refreshMobile(String refreshToken) throws Exception {
        return mockMvc.perform(post("/auth/refresh")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "refreshToken": "%s"
                    }
                    """.formatted(refreshToken)))
            .andExpect(status().isOk())
            .andReturn();
    }

    private String generateOpaqueToken() {
        byte[] randomBytes = new byte[64];
        new java.security.SecureRandom().nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private String hashRefresh(String rawToken) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest((rawToken + JWT_REFRESH_PEPPER).getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder(hash.length * 2);
        for (byte value : hash) {
            hex.append(String.format("%02x", value));
        }
        return hex.toString();
    }
}

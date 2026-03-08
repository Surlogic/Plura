package com.plura.plurabackend.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.plura.plurabackend.auth.model.AuthAuditEventType;
import com.plura.plurabackend.auth.model.RefreshToken;
import com.plura.plurabackend.auth.repository.AuthAuditLogRepository;
import com.plura.plurabackend.auth.repository.AuthSessionRepository;
import com.plura.plurabackend.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-auth-legacy-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-legacy-flow",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-for-legacy-flow",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "AUTH_EXPOSE_ACCESS_TOKEN=true",
    "AUTH_ALLOW_LEGACY_JWT=false",
    "AUTH_ALLOW_LEGACY_REFRESH_FALLBACK=false",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
})
@AutoConfigureMockMvc
class AuthLegacyCompatibilityIntegrationTest {

    private static final String JWT_SECRET = "test-secret-for-legacy-flow";
    private static final String JWT_ISSUER = "plura";
    private static final String JWT_REFRESH_PEPPER = "test-refresh-pepper-for-legacy-flow";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private AuthSessionRepository authSessionRepository;

    @Autowired
    private AuthAuditLogRepository authAuditLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void cleanUp() {
        authAuditLogRepository.deleteAll();
        authSessionRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void legacyRefreshFallbackDisabledRejectsLegacyRefreshAndAudits() throws Exception {
        User user = createUser("legacy-refresh@plura.com");
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
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("LEGACY_TOKEN_REJECTED"));

        Assertions.assertTrue(authAuditLogRepository.findAll().stream()
            .anyMatch(log -> log.getEventType() == AuthAuditEventType.LEGACY_TOKEN_REJECTED));
    }

    @Test
    void legacyJwtDisabledRejectsLegacyJwtAndAudits() throws Exception {
        User user = createUser("legacy-jwt@plura.com");
        String legacyJwt = JWT.create()
            .withSubject(String.valueOf(user.getId()))
            .withClaim("email", user.getEmail())
            .withClaim("role", UserRole.USER.name())
            .withIssuer(JWT_ISSUER)
            .withIssuedAt(new Date())
            .withExpiresAt(Date.from(Instant.now().plus(30, ChronoUnit.MINUTES)))
            .sign(Algorithm.HMAC256(JWT_SECRET));

        mockMvc.perform(get("/auth/me/cliente")
                .header("Authorization", "Bearer " + legacyJwt))
            .andExpect(status().isUnauthorized());

        Assertions.assertTrue(authAuditLogRepository.findAll().stream()
            .anyMatch(log -> log.getEventType() == AuthAuditEventType.LEGACY_TOKEN_REJECTED));
    }

    private User createUser(String email) {
        User user = new User();
        user.setFullName("Legacy Demo");
        user.setEmail(email);
        user.setPhoneNumber("+5491111111111");
        user.setPassword(passwordEncoder.encode("Password123"));
        user.setRole(UserRole.USER);
        user.setSessionVersion(1);
        return userRepository.save(user);
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

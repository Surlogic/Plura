package com.plura.plurabackend.auth;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.plura.plurabackend.auth.oauth.OAuthUserInfo;
import com.plura.plurabackend.auth.oauth.providers.AppleTokenVerifier;
import com.plura.plurabackend.auth.oauth.providers.GoogleTokenVerifier;
import com.plura.plurabackend.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-auth-oauth-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-oauth-flow",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-for-oauth-flow",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "AUTH_EXPOSE_ACCESS_TOKEN=true",
    "AUTH_OAUTH_GOOGLE_ALLOW_DIRECT_TOKEN=true",
    "HIKARI_CONNECTION_INIT_SQL=SELECT 1",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
})
@AutoConfigureMockMvc
class AuthOAuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private ProfessionalProfileRepository professionalProfileRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private GoogleTokenVerifier googleTokenVerifier;

    @MockBean
    private AppleTokenVerifier appleTokenVerifier;

    @BeforeEach
    void cleanUp() {
        refreshTokenRepository.deleteAll();
        professionalProfileRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void oauthGoogleCreatesNewUser() throws Exception {
        when(googleTokenVerifier.verify("x")).thenReturn(
            new OAuthUserInfo("google", "g123", "new@plura.com", "New User", "http://img")
        );

        mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"token\":\"x\",\"authAction\":\"REGISTER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.user.email").value("new@plura.com"));

        User stored = userRepository.findByEmail("new@plura.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals("google", stored.getProvider());
        org.junit.jupiter.api.Assertions.assertEquals("g123", stored.getProviderId());
    }

    @Test
    void oauthGoogleCreatesNewProfessionalWhenDesiredRoleProfessional() throws Exception {
        when(googleTokenVerifier.verify("pro-google")).thenReturn(
            new OAuthUserInfo("google", "g-prof", "pro@plura.com", "Pro User", "http://img")
        );

        mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"token\":\"pro-google\",\"desiredRole\":\"PROFESSIONAL\",\"authAction\":\"REGISTER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.user.email").value("pro@plura.com"));

        User stored = userRepository.findByEmail("pro@plura.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(UserRole.PROFESSIONAL, stored.getRole());
        org.junit.jupiter.api.Assertions.assertTrue(
            professionalProfileRepository.findByUser_Id(stored.getId()).isPresent()
        );
    }

    @Test
    void oauthGoogleUpdatesExistingUserByEmail() throws Exception {
        User existing = new User();
        existing.setFullName("Existing User");
        existing.setEmail("exist@plura.com");
        existing.setPassword(passwordEncoder.encode("secret-1234"));
        existing.setRole(UserRole.USER);
        userRepository.save(existing);

        when(googleTokenVerifier.verify("google-existing")).thenReturn(
            new OAuthUserInfo("google", "g999", "exist@plura.com", "Existing User", "http://img2")
        );

        mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"token\":\"google-existing\",\"authAction\":\"LOGIN\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.user.email").value("exist@plura.com"));

        org.junit.jupiter.api.Assertions.assertEquals(1L, userRepository.count());
        User updated = userRepository.findByEmail("exist@plura.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals("google", updated.getProvider());
        org.junit.jupiter.api.Assertions.assertEquals("g999", updated.getProviderId());
    }

    @Test
    void oauthGooglePromotesExistingClientToProfessionalWhenDesiredRoleProfessional() throws Exception {
        User existing = new User();
        existing.setFullName("Existing Client");
        existing.setEmail("upgrade@plura.com");
        existing.setPassword(passwordEncoder.encode("secret-1234"));
        existing.setRole(UserRole.USER);
        userRepository.save(existing);

        when(googleTokenVerifier.verify("google-upgrade")).thenReturn(
            new OAuthUserInfo("google", "g-upgrade", "upgrade@plura.com", "Existing Client", "http://img2")
        );

        mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"token\":\"google-upgrade\",\"desiredRole\":\"PROFESSIONAL\",\"authAction\":\"REGISTER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.user.email").value("upgrade@plura.com"));

        User updated = userRepository.findByEmail("upgrade@plura.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(UserRole.PROFESSIONAL, updated.getRole());
        org.junit.jupiter.api.Assertions.assertEquals("google", updated.getProvider());
        org.junit.jupiter.api.Assertions.assertEquals("g-upgrade", updated.getProviderId());
        org.junit.jupiter.api.Assertions.assertTrue(
            professionalProfileRepository.findByUser_Id(updated.getId()).isPresent()
        );
    }

    @Test
    void oauthGoogleLoginDoesNotCreateAccountWhenUserDoesNotExist() throws Exception {
        when(googleTokenVerifier.verify("google-missing")).thenReturn(
            new OAuthUserInfo("google", "g-missing", "missing@plura.com", "Missing User", "http://img")
        );

        mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"token\":\"google-missing\",\"authAction\":\"LOGIN\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("No existe una cuenta asociada. Registrate primero."));

        org.junit.jupiter.api.Assertions.assertEquals(0L, userRepository.count());
    }

    @Test
    void oauthAppleWithoutEmailResolvesByProviderId() throws Exception {
        User existing = new User();
        existing.setFullName("Apple Existing");
        existing.setEmail("apple-existing@plura.com");
        existing.setPassword(passwordEncoder.encode("secret-apple-1234"));
        existing.setRole(UserRole.USER);
        existing.setProvider("apple");
        existing.setProviderId("a123");
        userRepository.save(existing);

        when(appleTokenVerifier.verify("apple-no-email")).thenReturn(
            new OAuthUserInfo("apple", "a123", null, "Apple User", null)
        );

        mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"apple\",\"token\":\"apple-no-email\",\"authAction\":\"LOGIN\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.user.email").value("apple-existing@plura.com"));

        org.junit.jupiter.api.Assertions.assertEquals(1L, userRepository.count());
        User updated = userRepository.findByProviderAndProviderId("apple", "a123").orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals("apple-existing@plura.com", updated.getEmail());
    }

    @Test
    void oauthAppleProviderMismatchReturnsConflict() throws Exception {
        User existing = new User();
        existing.setFullName("Google Existing");
        existing.setEmail("x@plura.com");
        existing.setPassword(passwordEncoder.encode("secret-google-1234"));
        existing.setRole(UserRole.USER);
        existing.setProvider("google");
        existing.setProviderId("g1");
        userRepository.save(existing);

        when(appleTokenVerifier.verify("apple-mismatch")).thenReturn(
            new OAuthUserInfo("apple", "a1", "x@plura.com", "Apple User", null)
        );

        mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"apple\",\"token\":\"apple-mismatch\",\"authAction\":\"LOGIN\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("OAUTH_PROVIDER_MISMATCH"))
            .andExpect(jsonPath("$.message").value("Email already linked to a different provider"));

        org.junit.jupiter.api.Assertions.assertEquals(1L, userRepository.count());
    }

    @Test
    void oauthAppleWithoutEmailFirstLoginReturnsBadRequest() throws Exception {
        when(appleTokenVerifier.verify("apple-first-without-email")).thenReturn(
            new OAuthUserInfo("apple", "a123", null, "Apple User", null)
        );

        mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"apple\",\"token\":\"apple-first-without-email\",\"authAction\":\"REGISTER\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("APPLE_EMAIL_REQUIRED_FIRST_LOGIN"))
            .andExpect(jsonPath("$.message").value(
                "Apple did not provide email. Please complete first login from Apple flow that includes email."
            ));

        org.junit.jupiter.api.Assertions.assertEquals(0L, userRepository.count());
    }

    @Test
    void oauthInvalidTokenReturnsBadRequest() throws Exception {
        when(googleTokenVerifier.verify(anyString())).thenThrow(new IllegalArgumentException("Token OAuth inválido"));

        mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"token\":\"invalid\",\"authAction\":\"LOGIN\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("ILLEGAL_ARGUMENT"))
            .andExpect(jsonPath("$.message").value("Token OAuth inválido"));

        org.junit.jupiter.api.Assertions.assertEquals(0L, userRepository.count());
    }
}

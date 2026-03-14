package com.plura.plurabackend.core.auth;

import static org.mockito.ArgumentMatchers.any;
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
import com.plura.plurabackend.core.auth.repository.PasswordResetTokenRepository;
import com.plura.plurabackend.core.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-auth-password-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-password-flow",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-for-password-flow",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "AUTH_EXPOSE_ACCESS_TOKEN=true",
    "AUTH_PASSWORD_RESET_PUBLIC_BASE_URL=http://localhost:3002",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
})
@AutoConfigureMockMvc
class AuthPasswordLifecycleIntegrationTest {

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
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private PasswordResetNotificationSender passwordResetNotificationSender;

    @BeforeEach
    void cleanUp() {
        passwordResetTokenRepository.deleteAll();
        authSessionRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void changePasswordRevokesSessionsAndRequiresCurrentPassword() throws Exception {
        registerClient("change-password@plura.com", "Password123");
        JsonNode loginPayload = loginClient("change-password@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();

        mockMvc.perform(post("/auth/password/change")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "currentPassword": "Password123",
                      "newPassword": "Password456"
                    }
                    """))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/auth/me/cliente")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/auth/login/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "change-password@plura.com",
                      "password": "Password123"
                    }
                    """))
            .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/auth/login/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "change-password@plura.com",
                      "password": "Password456"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty());

        JsonNode freshLoginPayload = loginClient("change-password@plura.com", "Password456");
        String freshAccessToken = freshLoginPayload.path("accessToken").asText();

        mockMvc.perform(post("/auth/password/change")
                .header("Authorization", "Bearer " + freshAccessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "currentPassword": "wrong-password",
                      "newPassword": "Password789"
                    }
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("CURRENT_PASSWORD_INVALID"));
    }

    @Test
    void forgotPasswordIsNeutralAndCreatesSingleUseResetTokenForEligibleUser() throws Exception {
        registerClient("forgot-password@plura.com", "Password123");

        mockMvc.perform(post("/auth/password/forgot")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "missing@plura.com"
                    }
                    """))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.message").value(
                "Si existe una cuenta recuperable para ese email, te enviamos instrucciones para restablecer la contraseña."
            ));

        mockMvc.perform(post("/auth/password/forgot")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "forgot-password@plura.com"
                    }
                    """))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.message").value(
                "Si existe una cuenta recuperable para ese email, te enviamos instrucciones para restablecer la contraseña."
            ));

        verify(passwordResetNotificationSender, times(1)).sendPasswordReset(any());
        org.junit.jupiter.api.Assertions.assertEquals(1L, passwordResetTokenRepository.count());
    }

    @Test
    void resetPasswordConsumesTokenRevokesSessionsAndPreventsReuse() throws Exception {
        registerClient("reset-password@plura.com", "Password123");
        JsonNode loginPayload = loginClient("reset-password@plura.com", "Password123");
        String accessToken = loginPayload.path("accessToken").asText();

        mockMvc.perform(post("/auth/password/forgot")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "reset-password@plura.com"
                    }
                    """))
            .andExpect(status().isAccepted());

        ArgumentCaptor<PasswordResetNotificationSender.PasswordResetNotification> captor =
            ArgumentCaptor.forClass(PasswordResetNotificationSender.PasswordResetNotification.class);
        verify(passwordResetNotificationSender).sendPasswordReset(captor.capture());
        String rawResetToken = captor.getValue().rawToken();

        mockMvc.perform(post("/auth/password/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "token": "%s",
                      "newPassword": "Password456"
                    }
                    """.formatted(rawResetToken)))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/auth/me/cliente")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/auth/password/reset")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "token": "%s",
                      "newPassword": "Password789"
                    }
                    """.formatted(rawResetToken)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("TOKEN_INVALID"));

        mockMvc.perform(post("/auth/login/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "reset-password@plura.com",
                      "password": "Password123"
                    }
                    """))
            .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/auth/login/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "reset-password@plura.com",
                      "password": "Password456"
                    }
                    """))
            .andExpect(status().isOk());
    }

    @Test
    void forgotPasswordSkipsOAuthOnlyAccountsWithoutLocalPassword() throws Exception {
        User user = new User();
        user.setFullName("OAuth User");
        user.setEmail("oauth-only@plura.com");
        user.setPassword(passwordEncoder.encode("random-oauth-password"));
        user.setRole(UserRole.USER);
        user.setProvider("google");
        userRepository.save(user);

        mockMvc.perform(post("/auth/password/forgot")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "oauth-only@plura.com"
                    }
                    """))
            .andExpect(status().isAccepted());

        verify(passwordResetNotificationSender, times(0)).sendPasswordReset(any());
        org.junit.jupiter.api.Assertions.assertEquals(0L, passwordResetTokenRepository.count());
    }

    private void registerClient(String email, String password) throws Exception {
        mockMvc.perform(post("/auth/register/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Cliente Demo",
                      "email": "%s",
                      "phoneNumber": "+5491111111111",
                      "password": "%s"
                    }
                    """.formatted(email, password)))
            .andExpect(status().isAccepted());
    }

    private JsonNode loginClient(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "%s",
                      "password": "%s"
                    }
                    """.formatted(email, password)))
            .andExpect(status().isOk())
            .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}

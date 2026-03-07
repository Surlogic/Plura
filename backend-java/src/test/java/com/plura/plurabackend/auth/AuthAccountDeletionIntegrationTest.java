package com.plura.plurabackend.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-auth-delete-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-account-deletion",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-for-account-deletion",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "AUTH_EXPOSE_ACCESS_TOKEN=true",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
})
@AutoConfigureMockMvc
class AuthAccountDeletionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @BeforeEach
    void cleanUp() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void deletedAccountCannotKeepUsingPreviousAccessToken() throws Exception {
        mockMvc.perform(post("/auth/register/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Cliente Demo",
                      "email": "cliente-delete@plura.com",
                      "phoneNumber": "+5491111111111",
                      "password": "Password123"
                    }
                    """))
            .andExpect(status().isAccepted());

        MvcResult loginResult = mockMvc.perform(post("/auth/login/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "cliente-delete@plura.com",
                      "password": "Password123"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andReturn();

        String accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .path("accessToken")
            .asText();

        mockMvc.perform(delete("/auth/me")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/auth/me/cliente")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isUnauthorized());

        User deletedUser = userRepository.findByEmail("cliente-delete@plura.com").orElse(null);
        org.junit.jupiter.api.Assertions.assertNull(deletedUser);

        User anonymizedUser = userRepository.findAll().stream().findFirst().orElseThrow();
        org.junit.jupiter.api.Assertions.assertNotNull(anonymizedUser.getDeletedAt());
        org.junit.jupiter.api.Assertions.assertTrue(anonymizedUser.getEmail().endsWith("@plura.invalid"));
    }

    @Test
    void deletedClientCanRegisterAgainWithSameEmailEvenIfOldAccessTokenIsSent() throws Exception {
        mockMvc.perform(post("/auth/register/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Cliente Demo",
                      "email": "cliente-to-pro@plura.com",
                      "phoneNumber": "+5491111111111",
                      "password": "Password123"
                    }
                    """))
            .andExpect(status().isAccepted());

        MvcResult loginResult = mockMvc.perform(post("/auth/login/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "cliente-to-pro@plura.com",
                      "password": "Password123"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andReturn();

        String accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .path("accessToken")
            .asText();

        mockMvc.perform(delete("/auth/me")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isNoContent());

        mockMvc.perform(post("/auth/register/cliente")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Cliente Reingreso",
                      "email": "cliente-to-pro@plura.com",
                      "phoneNumber": "+5491122222222",
                      "password": "Password456"
                    }
                    """))
            .andExpect(status().isAccepted());

        mockMvc.perform(post("/auth/login/cliente")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "cliente-to-pro@plura.com",
                      "password": "Password456"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.user.email").value("cliente-to-pro@plura.com"));
    }
}

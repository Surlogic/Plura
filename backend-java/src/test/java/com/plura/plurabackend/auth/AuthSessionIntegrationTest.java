package com.plura.plurabackend.core.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.auth.model.AuthAuditEventType;
import com.plura.plurabackend.core.auth.model.RefreshToken;
import com.plura.plurabackend.core.auth.repository.AuthAuditLogRepository;
import com.plura.plurabackend.core.auth.repository.AuthSessionRepository;
import com.plura.plurabackend.core.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.core.category.model.Category;
import com.plura.plurabackend.core.category.repository.CategoryRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Tests de autenticacion, sesiones, OTP y recuperacion de cuenta.
 * Cubren escenarios de auth sesion integracion para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
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
    "AUTH_ALLOW_LEGACY_REFRESH_FALLBACK=true",
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

    @Autowired
    private ProfessionalProfileRepository professionalProfileRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Prepara mocks, datos base o configuracion comun antes de cada caso de prueba.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @BeforeEach
    void cleanUp() {
        authAuditLogRepository.deleteAll();
        authSessionRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        professionalProfileRepository.deleteAll();
        categoryRepository.deleteAll();
        userRepository.deleteAll();
    }

    /**
     * Escenario: web login crea sesion y lista eso.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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

    /**
     * Escenario: mobile refresh usa body y rotates refresh token.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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
    void professionalAccountCanSelectClientContextAndLoadClientProfile() throws Exception {
        registerProfessional("dual-client@plura.com");

        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "dual-client@plura.com",
                      "password": "Password123",
                      "desiredContext": "CLIENT"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.activeContext.type").value("CLIENT"))
            .andExpect(jsonPath("$.contexts[?(@.type == 'CLIENT')]").exists())
            .andExpect(jsonPath("$.contexts[?(@.type == 'PROFESSIONAL')]").exists())
            .andReturn();

        String accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .path("accessToken")
            .asText();

        mockMvc.perform(get("/auth/me/cliente")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("dual-client@plura.com"));
    }

    @Test
    void professionalAccountWithoutDesiredContextRequiresExplicitSelection() throws Exception {
        registerProfessional("dual-selection@plura.com");

        mockMvc.perform(post("/auth/login")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "dual-selection@plura.com",
                      "password": "Password123"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.contextSelectionRequired").value(true))
            .andExpect(jsonPath("$.contexts[?(@.type == 'CLIENT')]").exists())
            .andExpect(jsonPath("$.contexts[?(@.type == 'PROFESSIONAL')]").exists());
    }

    @Test
    void contextSelectClientWorksForProfessionalAccount() throws Exception {
        registerProfessional("select-client@plura.com");
        JsonNode loginPayload = loginUnifiedMobile("select-client@plura.com");

        MvcResult selectResult = mockMvc.perform(post("/auth/context/select")
                .header("Authorization", "Bearer " + loginPayload.path("accessToken").asText())
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "type": "CLIENT"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.activeContext.type").value("CLIENT"))
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andReturn();

        String clientAccessToken = objectMapper.readTree(selectResult.getResponse().getContentAsString())
            .path("accessToken")
            .asText();

        mockMvc.perform(get("/auth/me/cliente")
                .header("Authorization", "Bearer " + clientAccessToken))
            .andExpect(status().isOk());
    }

    @Test
    void professionalProfileRequiresActiveProfile() throws Exception {
        registerProfessional("inactive-profile@plura.com");
        User user = userRepository.findByEmailAndDeletedAtIsNull("inactive-profile@plura.com").orElseThrow();
        professionalProfileRepository.findByUser_Id(user.getId()).ifPresent(profile -> {
            profile.setActive(false);
            professionalProfileRepository.save(profile);
        });

        JsonNode loginPayload = loginUnifiedMobile("inactive-profile@plura.com");

        mockMvc.perform(get("/auth/me/profesional")
                .header("Authorization", "Bearer " + loginPayload.path("accessToken").asText()))
            .andExpect(status().isForbidden());
    }

    @Test
    void refreshPreservesClientContextWhenAccessTokenCarriesIt() throws Exception {
        registerProfessional("refresh-client-context@plura.com");

        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "refresh-client-context@plura.com",
                      "password": "Password123",
                      "desiredContext": "CLIENT"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode loginPayload = objectMapper.readTree(loginResult.getResponse().getContentAsString());

        MvcResult refreshResult = mockMvc.perform(post("/auth/refresh")
                .header("X-Plura-Client-Platform", "MOBILE")
                .header("X-Plura-Session-Transport", "BODY")
                .header("Authorization", "Bearer " + loginPayload.path("accessToken").asText())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "refreshToken": "%s"
                    }
                    """.formatted(loginPayload.path("refreshToken").asText())))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode refreshPayload = objectMapper.readTree(refreshResult.getResponse().getContentAsString());

        mockMvc.perform(get("/auth/me/cliente")
                .header("Authorization", "Bearer " + refreshPayload.path("accessToken").asText()))
            .andExpect(status().isOk());
    }

    @Test
    void authenticatedClientActivatesProfessionalProfileOnSameAccount() throws Exception {
        ensureCategory("cabello", "Cabello");
        registerClient("activate-professional@plura.com");
        JsonNode loginPayload = loginMobile("activate-professional@plura.com");

        mockMvc.perform(post("/auth/professional-profile/activate")
                .header("Authorization", "Bearer " + loginPayload.path("accessToken").asText())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "categorySlugs": ["cabello"],
                      "tipoCliente": "SIN_LOCAL"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.activeContext.type").value("CLIENT"))
            .andExpect(jsonPath("$.contexts[?(@.type == 'CLIENT')]").exists())
            .andExpect(jsonPath("$.contexts[?(@.type == 'PROFESSIONAL')]").exists());

        User user = userRepository.findByEmailAndDeletedAtIsNull("activate-professional@plura.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(1L, userRepository.count());
        ProfessionalProfile profile = professionalProfileRepository.findByUser_Id(user.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(Boolean.TRUE.equals(profile.getActive()));
        org.junit.jupiter.api.Assertions.assertEquals("Cabello", profile.getRubro());
    }

    @Test
    void professionalProfileActivationIsIdempotentForActiveProfile() throws Exception {
        ensureCategory("cabello", "Cabello");
        registerClient("activate-twice@plura.com");
        JsonNode loginPayload = loginMobile("activate-twice@plura.com");

        String payload = """
            {
              "categorySlugs": ["cabello"],
              "tipoCliente": "SIN_LOCAL"
            }
            """;
        mockMvc.perform(post("/auth/professional-profile/activate")
                .header("Authorization", "Bearer " + loginPayload.path("accessToken").asText())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isOk());
        Long profileId = professionalProfileRepository.findAll().getFirst().getId();

        mockMvc.perform(post("/auth/professional-profile/activate")
                .header("Authorization", "Bearer " + loginPayload.path("accessToken").asText())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.contexts[?(@.type == 'PROFESSIONAL')]").exists());

        org.junit.jupiter.api.Assertions.assertEquals(1L, professionalProfileRepository.count());
        org.junit.jupiter.api.Assertions.assertEquals(profileId, professionalProfileRepository.findAll().getFirst().getId());
    }

    @Test
    void professionalProfileActivationRequiresAuthenticatedUser() throws Exception {
        ensureCategory("cabello", "Cabello");

        mockMvc.perform(post("/auth/professional-profile/activate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "categorySlugs": ["cabello"],
                      "tipoCliente": "SIN_LOCAL"
                    }
                    """))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void professionalProfileActivationReactivatesInactiveProfile() throws Exception {
        ensureCategory("cabello", "Cabello");
        registerClient("reactivate-professional@plura.com");
        User user = userRepository.findByEmailAndDeletedAtIsNull("reactivate-professional@plura.com").orElseThrow();

        ProfessionalProfile inactive = new ProfessionalProfile();
        inactive.setUser(user);
        inactive.setRubro("Legacy");
        inactive.setDisplayName("Cliente Demo");
        inactive.setSlug("reactivate-professional");
        inactive.setTipoCliente("SIN_LOCAL");
        inactive.setActive(false);
        Long profileId = professionalProfileRepository.save(inactive).getId();

        JsonNode loginPayload = loginMobile("reactivate-professional@plura.com");
        mockMvc.perform(post("/auth/professional-profile/activate")
                .header("Authorization", "Bearer " + loginPayload.path("accessToken").asText())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "categorySlugs": ["cabello"],
                      "tipoCliente": "SIN_LOCAL"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.contexts[?(@.type == 'PROFESSIONAL')]").exists());

        ProfessionalProfile profile = professionalProfileRepository.findById(profileId).orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(Boolean.TRUE.equals(profile.getActive()));
        org.junit.jupiter.api.Assertions.assertEquals(1L, professionalProfileRepository.count());
    }

    /**
     * Escenario: legacy refresh fallback migrates sesion cuando compatibilidad is enabled.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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

    /**
     * Escenario: refresh reuse revokes compromised sesion y permite nuevo clean login.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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

    /**
     * Escenario: logout todos revokes current acceso token by sesion version.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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

    /**
     * Escenario: publico health ignores invalido bearer token.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void publicHealthIgnoresInvalidBearerToken() throws Exception {
        mockMvc.perform(get("/health")
                .header("Authorization", "Bearer invalid-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ok"));
    }

    /**
     * Escenario: publico categories ignore invalido acceso cookie.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void publicCategoriesIgnoreInvalidAccessCookie() throws Exception {
        mockMvc.perform(get("/categories")
                .cookie(new MockCookie("plura_access_token", "invalid-token")))
            .andExpect(status().isOk());
    }

    /**
     * Escenario: refresh con invalido cookies verifica que devuelva no autorizado instead of server error.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void refreshWithInvalidCookiesReturnsUnauthorizedInsteadOfServerError() throws Exception {
        mockMvc.perform(post("/auth/refresh")
                .header("Origin", "http://localhost:3002")
                .header("X-Plura-Client-Platform", "WEB")
                .header("X-Plura-Session-Transport", "COOKIE")
                .cookie(
                    new MockCookie("plura_access_token", "invalid-access-token"),
                    new MockCookie("plura_refresh_token", "invalid-refresh-token")
                ))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("REFRESH_TOKEN_INVALID"));
    }

    /**
     * Escenario: eliminar sesion revokes only requested sesion.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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

    private void registerProfessional(String email) {
        User user = new User();
        user.setFullName("Profesional Demo");
        user.setEmail(email);
        user.setPhoneNumber("+5491111111111");
        user.setPassword(passwordEncoder.encode("Password123"));
        user.setRole(UserRole.PROFESSIONAL);
        user.setSessionVersion(1);
        User savedUser = userRepository.save(user);

        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setUser(savedUser);
        profile.setRubro("Cabello");
        profile.setDisplayName("Profesional Demo");
        profile.setSlug(email.replace("@", "-").replace(".", "-"));
        profile.setTipoCliente("SIN_LOCAL");
        profile.setActive(true);
        professionalProfileRepository.save(profile);
    }

    private Category ensureCategory(String slug, String name) {
        return categoryRepository.findBySlug(slug).orElseGet(() -> {
            Category category = new Category();
            category.setSlug(slug);
            category.setName(name);
            category.setDisplayOrder(1);
            category.setActive(true);
            return categoryRepository.save(category);
        });
    }

    private JsonNode loginUnifiedMobile(String email) throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/auth/login")
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

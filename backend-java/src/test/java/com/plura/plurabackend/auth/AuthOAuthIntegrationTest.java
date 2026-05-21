package com.plura.plurabackend.core.auth;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.jayway.jsonpath.JsonPath;
import com.plura.plurabackend.core.auth.oauth.OAuthUserInfo;
import com.plura.plurabackend.core.auth.oauth.providers.AppleTokenVerifier;
import com.plura.plurabackend.core.auth.oauth.providers.GoogleTokenVerifier;
import com.plura.plurabackend.core.billing.mercadopago.MercadoPagoSubscriptionService;
import com.plura.plurabackend.core.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.core.auth.repository.AuthSessionRepository;
import com.plura.plurabackend.core.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.core.category.model.Category;
import com.plura.plurabackend.core.category.repository.CategoryRepository;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Tests de autenticacion, sesiones, OTP y recuperacion de cuenta.
 * Cubren escenarios de auth o auth integracion para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
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
    "AUTH_REGISTRATION_PHONE_VERIFICATION_REQUIRED=true",
    "VONAGE_VERIFY_ENABLED=true",
    "VONAGE_API_KEY=test-api-key",
    "VONAGE_API_SECRET=test-api-secret",
    "AUTH_OAUTH_GOOGLE_ALLOW_DIRECT_TOKEN=true",
    "BILLING_TRIAL_IDENTITY_PEPPER=test-billing-trial-pepper",
    "HIKARI_CONNECTION_INIT_SQL=SELECT 1",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
})
@AutoConfigureMockMvc
class AuthOAuthIntegrationTest {

    private static final String JWT_REFRESH_PEPPER = "test-refresh-pepper-for-oauth-flow";
    private static final String JWT_ISSUER = "plura";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private AuthSessionRepository authSessionRepository;

    @Autowired
    private ProfessionalProfileRepository professionalProfileRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private GoogleTokenVerifier googleTokenVerifier;

    @MockBean
    private AppleTokenVerifier appleTokenVerifier;

    @MockBean
    private MercadoPagoSubscriptionService mercadoPagoSubscriptionService;

    /**
     * Prepara mocks, datos base o configuracion comun antes de cada caso de prueba.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @BeforeEach
    void cleanUp() {
        authSessionRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        subscriptionRepository.deleteAll();
        professionalProfileRepository.deleteAll();
        userRepository.deleteAll();
        categoryRepository.deleteAll();
    }

    /**
     * Escenario: OAuth Google registro sin desiredRole no crea usuario por default.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void oauthGoogleRegisterWithoutDesiredRoleReturnsBadRequestAndDoesNotCreateUser() throws Exception {
        when(googleTokenVerifier.verify("x")).thenReturn(
            new OAuthUserInfo("google", "g123", "new@plura.com", "New User", "http://img")
        );

        mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"token\":\"x\",\"authAction\":\"REGISTER\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("desiredRole es obligatorio para registro OAuth"));

        org.junit.jupiter.api.Assertions.assertEquals(0L, userRepository.count());
    }

    /**
     * Escenario: OAuth Google crea nuevo cliente cuando desired rol user.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void oauthGoogleRegisterWithDesiredRoleUserCreatesUserWithoutVerifyingEmail() throws Exception {
        when(googleTokenVerifier.verify("client-google")).thenReturn(
            new OAuthUserInfo("google", "g-client", "client@plura.com", "Client User", "http://img")
        );

        mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"token\":\"client-google\",\"desiredRole\":\"USER\",\"authAction\":\"REGISTER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.user.email").value("client@plura.com"));

        User stored = userRepository.findByEmail("client@plura.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(UserRole.USER, stored.getRole());
        org.junit.jupiter.api.Assertions.assertEquals("google", stored.getProvider());
        org.junit.jupiter.api.Assertions.assertEquals("g-client", stored.getProviderId());
        org.junit.jupiter.api.Assertions.assertNull(stored.getEmailVerifiedAt());
        org.junit.jupiter.api.Assertions.assertTrue(
            professionalProfileRepository.findByUser_Id(stored.getId()).isEmpty()
        );
    }

    @Test
    void completeOAuthPhoneForClientRequiresVerificationTokenWhenConfigured() throws Exception {
        when(googleTokenVerifier.verify("client-phone-required")).thenReturn(
            new OAuthUserInfo(
                "google",
                "g-client-phone-required",
                "client-phone-required@plura.com",
                "Client Phone Required",
                "http://img"
            )
        );

        MvcResult oauthResult = mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"token\":\"client-phone-required\",\"desiredRole\":\"USER\",\"authAction\":\"REGISTER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andReturn();

        String accessToken = JsonPath.read(oauthResult.getResponse().getContentAsString(), "$.accessToken");

        mockMvc.perform(post("/auth/oauth/complete-phone")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"phoneNumber":"+59899111999"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("PHONE_VERIFICATION_REQUIRED"));

        org.junit.jupiter.api.Assertions.assertNull(
            userRepository.findByEmail("client-phone-required@plura.com").orElseThrow().getPhoneNumber()
        );
    }

    /**
     * Escenario: OAuth Google para registro profesional solo devuelve identidad temporal.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void oauthGoogleRegisterWithDesiredRoleProfessionalDoesNotCreateUserOrProfile() throws Exception {
        when(googleTokenVerifier.verify("pro-google")).thenReturn(
            new OAuthUserInfo("google", "g-prof", "pro@plura.com", "Pro User", "http://img")
        );

        mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"token\":\"pro-google\",\"desiredRole\":\"PROFESSIONAL\",\"authAction\":\"REGISTER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.oauthRegistrationPending").value(true))
            .andExpect(jsonPath("$.oauthRegistrationToken").isNotEmpty())
            .andExpect(jsonPath("$.user.email").value("pro@plura.com"));

        org.junit.jupiter.api.Assertions.assertEquals(0L, userRepository.count());
        org.junit.jupiter.api.Assertions.assertEquals(0L, professionalProfileRepository.count());
    }

    /**
     * Escenario: OAuth Google actualiza existente usuario by email.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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

    /**
     * Escenario: OAuth Google permite sumar profesional sobre cliente existente solo al submit final.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void oauthGoogleRegisterProfessionalWithExistingClientReturnsPendingRegistration() throws Exception {
        seedCategory();
        User existing = new User();
        existing.setFullName("Existing Client");
        existing.setEmail("upgrade@plura.com");
        existing.setPassword(passwordEncoder.encode("secret-1234"));
        existing.setRole(UserRole.USER);
        userRepository.save(existing);

        when(googleTokenVerifier.verify("google-upgrade")).thenReturn(
            new OAuthUserInfo("google", "g-upgrade", "upgrade@plura.com", "Existing Client", "http://img2")
        );

        MvcResult oauthResult = mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"token\":\"google-upgrade\",\"desiredRole\":\"PROFESSIONAL\",\"authAction\":\"REGISTER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.oauthRegistrationPending").value(true))
            .andExpect(jsonPath("$.oauthRegistrationToken").isNotEmpty())
            .andExpect(jsonPath("$.user.email").value("upgrade@plura.com"))
            .andReturn();

        User updated = userRepository.findByEmail("upgrade@plura.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(UserRole.USER, updated.getRole());
        org.junit.jupiter.api.Assertions.assertNull(updated.getProvider());
        org.junit.jupiter.api.Assertions.assertNull(updated.getProviderId());
        org.junit.jupiter.api.Assertions.assertTrue(
            professionalProfileRepository.findByUser_Id(updated.getId()).isEmpty()
        );

        String oauthRegistrationToken = JsonPath.read(
            oauthResult.getResponse().getContentAsString(),
            "$.oauthRegistrationToken"
        );
        String checkoutToken = confirmedCheckoutTokenFor("upgrade@plura.com", "mp-oauth-upgrade");

        mockMvc.perform(post("/auth/register/profesional")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Existing Client Pro",
                      "email": "upgrade@plura.com",
                      "phoneNumber": "+59899111334",
                      "tipoCliente": "SIN_LOCAL",
                      "categorySlugs": ["belleza"],
                      "billingCheckoutToken": "%s",
                      "oauthRegistrationToken": "%s"
                    }
                    """.formatted(checkoutToken, oauthRegistrationToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.activeContext.type").value("PROFESSIONAL"));

        User promoted = userRepository.findByEmail("upgrade@plura.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(existing.getId(), promoted.getId());
        org.junit.jupiter.api.Assertions.assertEquals(UserRole.PROFESSIONAL, promoted.getRole());
        org.junit.jupiter.api.Assertions.assertEquals("google", promoted.getProvider());
        org.junit.jupiter.api.Assertions.assertEquals("g-upgrade", promoted.getProviderId());
        org.junit.jupiter.api.Assertions.assertNull(promoted.getEmailVerifiedAt());
        org.junit.jupiter.api.Assertions.assertTrue(
            professionalProfileRepository.findByUser_Id(promoted.getId()).isPresent()
        );
    }

    @Test
    void registerProfessionalWithEmailPasswordCreatesProfessionalAndProfile() throws Exception {
        seedCategory();

        mockMvc.perform(post("/auth/register/profesional")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Pro Email",
                      "email": "pro-email@plura.com",
                      "phoneNumber": "+59899111222",
                      "password": "secret-1234",
                      "tipoCliente": "SIN_LOCAL",
                      "categorySlugs": ["belleza"],
                      "billingCheckoutToken": "%s"
                    }
                    """.formatted(confirmedCheckoutTokenFor("pro-email@plura.com", "mp-oauth-pro-email"))))
            .andExpect(status().isAccepted());

        User stored = userRepository.findByEmail("pro-email@plura.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(UserRole.PROFESSIONAL, stored.getRole());
        org.junit.jupiter.api.Assertions.assertTrue(
            professionalProfileRepository.findByUser_Id(stored.getId()).isPresent()
        );
    }

    @Test
    void registerProfessionalWithGoogleTokenCreatesProfessionalOnlyOnFinalSubmit() throws Exception {
        seedCategory();
        when(googleTokenVerifier.verify("pro-google-final")).thenReturn(
            new OAuthUserInfo("google", "g-final", "pro-google-final@plura.com", "Pro Google", "http://img")
        );

        MvcResult oauthResult = mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"google\",\"token\":\"pro-google-final\",\"desiredRole\":\"PROFESSIONAL\",\"authAction\":\"REGISTER\"}"))
            .andExpect(status().isOk())
            .andReturn();

        org.junit.jupiter.api.Assertions.assertEquals(0L, userRepository.count());
        String oauthRegistrationToken = JsonPath.read(
            oauthResult.getResponse().getContentAsString(),
            "$.oauthRegistrationToken"
        );
        String checkoutToken = confirmedCheckoutTokenFor("pro-google-final@plura.com", "mp-oauth-pro-google-final");

        mockMvc.perform(post("/auth/register/profesional")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Pro Google",
                      "email": "pro-google-final@plura.com",
                      "phoneNumber": "+59899111333",
                      "tipoCliente": "SIN_LOCAL",
                      "categorySlugs": ["belleza"],
                      "billingCheckoutToken": "%s",
                      "oauthRegistrationToken": "%s"
                    }
                    """.formatted(checkoutToken, oauthRegistrationToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.activeContext.type").value("PROFESSIONAL"));

        User stored = userRepository.findByEmail("pro-google-final@plura.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(UserRole.PROFESSIONAL, stored.getRole());
        org.junit.jupiter.api.Assertions.assertEquals("google", stored.getProvider());
        org.junit.jupiter.api.Assertions.assertEquals("g-final", stored.getProviderId());
        org.junit.jupiter.api.Assertions.assertNull(stored.getEmailVerifiedAt());
        org.junit.jupiter.api.Assertions.assertTrue(
            professionalProfileRepository.findByUser_Id(stored.getId()).isPresent()
        );
    }

    @Test
    void registerProfessionalWithMissingRequiredDataDoesNotCreateUser() throws Exception {
        mockMvc.perform(post("/auth/register/profesional")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Pro Invalid",
                      "email": "pro-invalid@plura.com",
                      "phoneNumber": "+59899111444",
                      "password": "secret-1234",
                      "tipoCliente": "SIN_LOCAL"
                    }
                    """))
            .andExpect(status().isBadRequest());

        org.junit.jupiter.api.Assertions.assertEquals(0L, userRepository.count());
        org.junit.jupiter.api.Assertions.assertEquals(0L, professionalProfileRepository.count());
    }

    /**
     * Escenario: OAuth Google login does no crear account cuando usuario does no exist.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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

    /**
     * Escenario: OAuth Apple sin email resolves by proveedor id.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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
        org.junit.jupiter.api.Assertions.assertNull(updated.getEmailVerifiedAt());
    }

    /**
     * Escenario: OAuth Apple proveedor mismatch verifica que devuelva conflict.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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

    /**
     * Escenario: OAuth Apple sin email first login verifica que devuelva bad request.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void oauthAppleWithoutEmailFirstLoginReturnsBadRequest() throws Exception {
        when(appleTokenVerifier.verify("apple-first-without-email")).thenReturn(
            new OAuthUserInfo("apple", "a123", null, "Apple User", null)
        );

        mockMvc.perform(post("/auth/oauth")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"apple\",\"token\":\"apple-first-without-email\",\"desiredRole\":\"USER\",\"authAction\":\"REGISTER\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("APPLE_EMAIL_REQUIRED_FIRST_LOGIN"))
            .andExpect(jsonPath("$.message").value(
                "Apple did not provide email. Please complete first login from Apple flow that includes email."
            ));

        org.junit.jupiter.api.Assertions.assertEquals(0L, userRepository.count());
    }

    /**
     * Escenario: OAuth invalido token verifica que devuelva bad request.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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

    private String confirmedCheckoutTokenFor(String email, String providerSubscriptionId) {
        when(mercadoPagoSubscriptionService.getSubscription(eq(providerSubscriptionId)))
            .thenReturn(new MercadoPagoSubscriptionService.SubscriptionSnapshot(
                providerSubscriptionId,
                "authorized",
                BigDecimal.valueOf(990),
                "UYU",
                null,
                email,
                "Plura PLAN_CORE",
                "mp-core-plan",
                null,
                Instant.now(),
                Instant.now()
            ));

        return JWT.create()
            .withIssuer(JWT_ISSUER)
            .withSubject(email)
            .withClaim("typ", "professional_registration_checkout")
            .withClaim("email", email)
            .withClaim("provider", "MERCADOPAGO")
            .withClaim("planCode", "PLAN_CORE")
            .withClaim("providerSubscriptionId", providerSubscriptionId)
            .withIssuedAt(new Date())
            .withExpiresAt(Date.from(Instant.now().plus(2, ChronoUnit.HOURS)))
            .sign(Algorithm.HMAC256(JWT_REFRESH_PEPPER));
    }

    private void seedCategory() {
        Category category = new Category();
        category.setName("Belleza");
        category.setSlug("belleza");
        category.setActive(true);
        categoryRepository.save(category);
    }
}

package com.plura.plurabackend.auth;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.auth.VonageVerifyClient;
import com.plura.plurabackend.core.billing.mercadopago.MercadoPagoSubscriptionService;
import com.plura.plurabackend.core.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.core.category.model.Category;
import com.plura.plurabackend.core.category.repository.CategoryRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
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
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-auth-registration-phone-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-registration-phone-flow",
    "JWT_REFRESH_PEPPER=test-refresh-pepper-for-registration-phone-flow",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "SPRING_FLYWAY_ENABLED=false",
    "APP_RATE_LIMIT_ENABLED=false",
    "AUTH_REGISTRATION_PHONE_VERIFICATION_REQUIRED=true",
    "VONAGE_VERIFY_ENABLED=true",
    "VONAGE_API_KEY=test-api-key",
    "VONAGE_API_SECRET=test-api-secret",
    "SWAGGER_ENABLED=false",
    "SQS_ENABLED=false",
})
@AutoConfigureMockMvc
class AuthRegistrationPhoneVerificationIntegrationTest {

    private static final String JWT_REFRESH_PEPPER = "test-refresh-pepper-for-registration-phone-flow";
    private static final String JWT_ISSUER = "plura";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProfessionalProfileRepository professionalProfileRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @MockBean
    private VonageVerifyClient vonageVerifyClient;

    @MockBean
    private MercadoPagoSubscriptionService mercadoPagoSubscriptionService;

    @BeforeEach
    void cleanUp() {
        subscriptionRepository.deleteAll();
        professionalProfileRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void verifiedPhoneTokenAllowsRegistrationAndMarksPhoneVerified() throws Exception {
        when(vonageVerifyClient.startSmsVerification(eq("+59899123456"))).thenReturn("req-123");
        when(vonageVerifyClient.checkSmsVerification(eq("req-123"), eq("123456"))).thenReturn(true);

        mockMvc.perform(post("/auth/register/phone/send")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"phoneNumber":"+59899123456"}
                    """))
            .andExpect(status().isAccepted());
        verify(vonageVerifyClient).startSmsVerification("+59899123456");

        String confirmBody = mockMvc.perform(post("/auth/register/phone/confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"phoneNumber":"+59899123456","code":"123456"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.verificationToken").isString())
            .andReturn()
            .getResponse()
            .getContentAsString();
        JsonNode confirmPayload = objectMapper.readTree(confirmBody);

        mockMvc.perform(post("/auth/register/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName":"Cliente Verificado",
                      "email":"verified-phone@plura.com",
                      "phoneNumber":"+59899123456",
                      "phoneVerificationToken":"%s",
                      "password":"Password123"
                    }
                    """.formatted(confirmPayload.path("verificationToken").asText())))
            .andExpect(status().isAccepted());

        org.junit.jupiter.api.Assertions.assertNotNull(
            userRepository.findByEmail("verified-phone@plura.com").orElseThrow().getPhoneVerifiedAt()
        );
    }

    @Test
    void clientRegistrationRequiresPhoneVerificationTokenWhenConfigured() throws Exception {
        mockMvc.perform(post("/auth/register/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName":"Cliente Sin Token",
                      "email":"missing-token@plura.com",
                      "phoneNumber":"+59899123457",
                      "password":"Password123"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("PHONE_VERIFICATION_REQUIRED"));

        org.junit.jupiter.api.Assertions.assertTrue(
            userRepository.findByEmail("missing-token@plura.com").isEmpty()
        );
    }

    @Test
    void professionalRegistrationAllowsContactPhoneWithoutVerificationToken() throws Exception {
        ensureCategory("cabello", "Cabello");

        mockMvc.perform(post("/auth/register/profesional")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName":"Profesional Sin Token",
                      "email":"professional-missing-token@plura.com",
                      "phoneNumber":"+59899123458",
                      "rubro":"Cabello",
                      "categorySlugs":["cabello"],
                      "tipoCliente":"SIN_LOCAL",
                      "billingCheckoutToken":"%s",
                      "password":"Password123"
                    }
                    """.formatted(confirmedCheckoutTokenFor(
                    "professional-missing-token@plura.com",
                    "mp-phone-professional-missing-token"
                ))))
            .andExpect(status().isAccepted());

        org.junit.jupiter.api.Assertions.assertNull(
            userRepository.findByEmail("professional-missing-token@plura.com").orElseThrow().getPhoneVerifiedAt()
        );
    }

    @Test
    void availabilityReportsExistingActiveEmailAndPhone() throws Exception {
        saveActiveUser("taken@plura.com", "+59899123459");

        mockMvc.perform(post("/auth/register/availability")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"taken@plura.com","phoneNumber":"+59899123459"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.emailAvailable").value(false))
            .andExpect(jsonPath("$.phoneAvailable").value(false))
            .andExpect(jsonPath("$.emailError").value("Ya existe una cuenta activa con este email. Iniciá sesión para continuar."))
            .andExpect(jsonPath("$.phoneError").value("Ese teléfono ya pertenece a otra cuenta activa."));
    }

    @Test
    void phoneSendDoesNotStartSmsWhenPhoneBelongsToActiveAccount() throws Exception {
        saveActiveUser("phone-owner@plura.com", "+59899123460");

        mockMvc.perform(post("/auth/register/phone/send")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"phoneNumber":"+59899123460"}
                    """))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("CLIENT_PHONE_ALREADY_IN_USE"))
            .andExpect(jsonPath("$.message").value("Ese teléfono ya está asociado a otra cuenta cliente activa."));

        verify(vonageVerifyClient, never()).startSmsVerification(eq("+59899123460"));
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

    private User saveActiveUser(String email, String phoneNumber) {
        User user = new User();
        user.setFullName("Cuenta Existente");
        user.setEmail(email);
        user.setPhoneNumber(phoneNumber);
        user.setPassword("hashed-password");
        user.setRole(UserRole.USER);
        return userRepository.save(user);
    }
}

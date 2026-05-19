package com.plura.plurabackend.core.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.JWTCreator;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.plura.plurabackend.core.auth.context.AuthContextDescriptor;
import com.plura.plurabackend.core.auth.context.AuthContextResolver;
import com.plura.plurabackend.core.auth.context.AuthContextType;
import com.plura.plurabackend.core.auth.dto.ActivateProfessionalProfileRequest;
import com.plura.plurabackend.core.auth.dto.AuthMeResponse;
import com.plura.plurabackend.core.auth.dto.LoginRequest;
import com.plura.plurabackend.core.auth.dto.OAuthPendingRegistrationResponse;
import com.plura.plurabackend.core.auth.dto.ProfesionalProfileResponse;
import com.plura.plurabackend.core.auth.dto.RegisterProfesionalRequest;
import com.plura.plurabackend.core.auth.dto.RegisterRequest;
import com.plura.plurabackend.core.auth.dto.RegistrationAvailabilityRequest;
import com.plura.plurabackend.core.auth.dto.RegistrationAvailabilityResponse;
import com.plura.plurabackend.core.auth.dto.SelectContextRequest;
import com.plura.plurabackend.core.auth.dto.SelectContextResponse;
import com.plura.plurabackend.core.auth.dto.UnifiedLoginRequest;
import com.plura.plurabackend.core.auth.dto.UnifiedLoginResponse;
import com.plura.plurabackend.core.auth.dto.UserResponse;
import com.plura.plurabackend.core.auth.dto.AuthSessionResponse;
import com.plura.plurabackend.core.auth.dto.CompleteOAuthPhoneRequest;
import com.plura.plurabackend.core.auth.model.AuthAuditEventType;
import com.plura.plurabackend.core.auth.model.AuthAuditStatus;
import com.plura.plurabackend.core.auth.model.AuthSession;
import com.plura.plurabackend.core.auth.model.AuthSessionType;
import com.plura.plurabackend.core.auth.oauth.dto.OAuthLoginRequest;
import com.plura.plurabackend.core.auth.oauth.AppleEmailRequiredFirstLoginException;
import com.plura.plurabackend.core.auth.oauth.OAuthService;
import com.plura.plurabackend.core.auth.oauth.OAuthProviderMismatchException;
import com.plura.plurabackend.core.auth.oauth.OAuthUserInfo;
import com.plura.plurabackend.core.security.jwt.AuthenticatedTokenDetails;
import com.plura.plurabackend.core.category.dto.CategoryResponse;
import com.plura.plurabackend.core.category.model.Category;
import com.plura.plurabackend.core.category.repository.CategoryRepository;
import com.plura.plurabackend.core.auth.model.RefreshToken;
import com.plura.plurabackend.core.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.core.common.util.SlugUtils;
import com.plura.plurabackend.core.professional.ProfessionalAccountProfileGateway;
import com.plura.plurabackend.core.professional.ProfessionalProfileRegistrationCommand;
import com.plura.plurabackend.professional.dto.MediaPresentationDto;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.plan.EffectiveProfessionalPlan;
import com.plura.plurabackend.professional.plan.EffectiveProfessionalPlanService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * AuthService es un servicio de negocio del modulo autenticacion.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: userRepository, categoryRepository, refreshTokenRepository, oAuthService, entre otros.
 * Foco funcional: servicios, autenticacion y sesiones.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OAuthService oAuthService;
    private final SessionService sessionService;
    private final AuthAuditService authAuditService;
    private final ProfessionalAccountProfileGateway professionalAccountProfileGateway;
    private final EffectiveProfessionalPlanService effectiveProfessionalPlanService;
    private final AuthContextResolver authContextResolver;
    private final PasswordEncoder passwordEncoder;
    private final RegistrationPhoneVerificationService registrationPhoneVerificationService;
    private final Algorithm jwtAlgorithm;
    private final long jwtExpirationMinutes;
    private final long refreshTokenDays;
    private final String refreshTokenPepper;
    private final String jwtIssuer;
    private final String dummyPasswordHash;
    private final boolean allowLegacyRefreshFallback;
    private static final String PROFESSIONAL_OAUTH_REGISTRATION_TOKEN_TYPE = "professional_oauth_registration";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Map<String, String> LEGACY_CATEGORY_ALIASES = Map.ofEntries(
        Map.entry("peluqueria", "cabello"),
        Map.entry("cejas", "pestanas-cejas"),
        Map.entry("pestanas", "pestanas-cejas"),
        Map.entry("faciales", "estetica-facial"),
        Map.entry("kinesiologia", "fisioterapia"),
        Map.entry("fisioterapia-kinesiologia", "fisioterapia"),
        Map.entry("fisioterapia-o-kinesiologia", "fisioterapia"),
        Map.entry("rehabilitacion-recuperacion-fisica", "rehabilitacion"),
        Map.entry("meditacion-mindfulness", "meditacion"),
        Map.entry("tratamientos-corporales", "tratamientos-corporales"),
        Map.entry("medicina-estetica", "medicina-estetica"),
        Map.entry("bienestar-holistico", "bienestar-holistico")
    );
    private static final String CLIENT_ACCOUNT_EXISTS_FOR_PROFESSIONAL_MESSAGE =
        "Existe una cuenta como cliente con este email. Creá una nueva para profesional o eliminá la cuenta de cliente antes de continuar.";
    private static final String CLIENT_ACCOUNT_LOGIN_MISMATCH_MESSAGE =
        "Esta cuenta es de cliente. Iniciá sesión desde el acceso de clientes.";
    private static final String PROFESSIONAL_ACCOUNT_LOGIN_MISMATCH_MESSAGE =
        "Esta cuenta es profesional. Iniciá sesión desde el acceso profesional.";
    private static final String CLIENT_ACCOUNT_EXISTS_MESSAGE =
        "Ya existe una cuenta cliente con este email. Iniciá sesión o recuperá tu contraseña si la olvidaste.";
    private static final String PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE =
        "Ya existe una cuenta profesional con este email. Iniciá sesión o recuperá tu contraseña si la olvidaste.";
    private static final String EMAIL_ALREADY_EXISTS_MESSAGE =
        "Ya existe una cuenta activa con este email. Iniciá sesión para continuar.";
    private static final String PHONE_ALREADY_IN_USE_MESSAGE =
        "Ese teléfono ya pertenece a otra cuenta activa.";

    public AuthService(
        UserRepository userRepository,
        CategoryRepository categoryRepository,
        RefreshTokenRepository refreshTokenRepository,
        OAuthService oAuthService,
        SessionService sessionService,
        AuthAuditService authAuditService,
        ProfessionalAccountProfileGateway professionalAccountProfileGateway,
        EffectiveProfessionalPlanService effectiveProfessionalPlanService,
        AuthContextResolver authContextResolver,
        PasswordEncoder passwordEncoder,
        RegistrationPhoneVerificationService registrationPhoneVerificationService,
        @Value("${jwt.secret}") String jwtSecret,
        @Value("${jwt.expiration-minutes:30}") long jwtExpirationMinutes,
        @Value("${jwt.refresh-days:30}") long refreshTokenDays,
        @Value("${jwt.refresh-pepper}") String refreshTokenPepper,
        @Value("${jwt.issuer:plura}") String jwtIssuer,
        @Value("${app.auth.allow-legacy-refresh-fallback:true}") boolean allowLegacyRefreshFallback
    ) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET no está configurado");
        }
        if (refreshTokenPepper == null || refreshTokenPepper.isBlank()) {
            throw new IllegalStateException("JWT_REFRESH_PEPPER no está configurado");
        }
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.oAuthService = oAuthService;
        this.sessionService = sessionService;
        this.authAuditService = authAuditService;
        this.professionalAccountProfileGateway = professionalAccountProfileGateway;
        this.effectiveProfessionalPlanService = effectiveProfessionalPlanService;
        this.authContextResolver = authContextResolver;
        this.passwordEncoder = passwordEncoder;
        this.registrationPhoneVerificationService = registrationPhoneVerificationService;
        this.jwtAlgorithm = Algorithm.HMAC256(jwtSecret);
        this.jwtExpirationMinutes = jwtExpirationMinutes;
        this.refreshTokenDays = refreshTokenDays;
        this.refreshTokenPepper = refreshTokenPepper;
        this.jwtIssuer = jwtIssuer;
        this.allowLegacyRefreshFallback = allowLegacyRefreshFallback;
        this.dummyPasswordHash = passwordEncoder.encode("plura-dummy-password");
    }

    public record AuthResult(
        String accessToken,
        String refreshToken,
        UserResponse user,
        UserRole role,
        AuthSessionResponse session
    ) {}

    public record OAuthResult(
        AuthResult auth,
        OAuthPendingRegistrationResponse pendingRegistration
    ) {
        public boolean isPendingRegistration() {
            return pendingRegistration != null;
        }
    }

    private record ProfessionalOAuthRegistrationIdentity(
        String provider,
        String providerId,
        String email,
        String fullName,
        String avatar
    ) {}

    /**
     * Bloque de datos refresh token issue usado internamente por esta clase.
     * Agrupa valores relacionados para que el calculo principal sea mas legible.
     */
    private record RefreshTokenIssue(String rawToken, RefreshToken entity) {}
    /**
     * Bloque de datos session token issue usado internamente por esta clase.
     * Agrupa valores relacionados para que el calculo principal sea mas legible.
     */
    private record SessionTokenIssue(String rawToken, AuthSession session) {}
    /**
     * Bloque de datos session context dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record SessionContext(
        AuthSessionType sessionType,
        String userAgent,
        String ipAddress
    ) {}

    @Transactional(readOnly = true)
    public RegistrationAvailabilityResponse checkRegistrationAvailability(
        RegistrationAvailabilityRequest request,
        Long currentUserId
    ) {
        String normalizedEmail = normalizeEmailForAvailability(request == null ? null : request.getEmail());
        String normalizedPhone = normalizePhoneNumber(request == null ? null : request.getPhoneNumber());

        boolean emailAvailable = true;
        boolean phoneAvailable = true;

        if (normalizedEmail != null) {
            User owner = userRepository.findByEmailAndDeletedAtIsNull(normalizedEmail).orElse(null);
            emailAvailable = owner == null || isSameUser(owner, currentUserId);
        }
        if (normalizedPhone != null) {
            User owner = userRepository.findFirstByPhoneNumberAndDeletedAtIsNull(normalizedPhone).orElse(null);
            phoneAvailable = owner == null || isSameUser(owner, currentUserId);
        }

        return new RegistrationAvailabilityResponse(
            emailAvailable,
            phoneAvailable,
            emailAvailable ? null : EMAIL_ALREADY_EXISTS_MESSAGE,
            phoneAvailable ? null : PHONE_ALREADY_IN_USE_MESSAGE
        );
    }

    @Transactional(readOnly = true)
    public void ensureRegistrationPhoneAvailable(String rawPhoneNumber, Long currentUserId) {
        String normalizedPhone = normalizePhoneNumber(rawPhoneNumber);
        ensurePhoneAvailable(normalizedPhone, currentUserId);
    }

    /**
     * Registra cliente y aplica las validaciones de alta correspondientes.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Transactional
    public void registerCliente(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmailAndDeletedAtIsNull(normalizedEmail).isPresent()) {
            burnPasswordWorkFactor(request.getPassword());
            throw new AuthApiException(
                HttpStatus.CONFLICT,
                "EMAIL_ALREADY_EXISTS",
                EMAIL_ALREADY_EXISTS_MESSAGE
            );
        }
        RegistrationPhoneVerificationService.VerificationResult phoneVerification =
            registrationPhoneVerificationService.resolveForRegistration(
                request.getPhoneNumber(),
                request.getPhoneVerificationToken()
            );
        ensurePhoneAvailable(phoneVerification.phoneNumber(), null);

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(normalizedEmail);
        user.setPhoneNumber(phoneVerification.phoneNumber());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.USER);
        if (phoneVerification.verified()) {
            user.setPhoneVerifiedAt(LocalDateTime.now());
        }

        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException exception) {
            burnPasswordWorkFactor(request.getPassword());
        }
    }

    /**
     * Registra profesional y aplica las validaciones de alta correspondientes.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Transactional
    public void registerProfesional(RegisterProfesionalRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        ProfessionalOAuthRegistrationIdentity oauthIdentity =
            resolveProfessionalOAuthRegistrationIdentity(request.getOauthRegistrationToken(), normalizedEmail);
        String rawPassword = request.getPassword() == null ? "" : request.getPassword();
        if (oauthIdentity == null && rawPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password es obligatorio");
        }
        if (oauthIdentity == null && rawPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password debe tener al menos 8 caracteres");
        }
        String tipoCliente = normalizeTipoCliente(request.getTipoCliente());
        boolean requiresLocation = requiresProfessionalLocation(tipoCliente);
        String country = normalizeLocationPart(request.getCountry(), requiresLocation, "country");
        String city = normalizeLocationPart(request.getCity(), requiresLocation, "city");
        String fullAddress = normalizeLocationPart(request.getFullAddress(), requiresLocation, "fullAddress");
        String location = requiresLocation ? composeLocation(fullAddress, city, country) : null;
        Double latitude = requiresLocation ? normalizeLatitude(request.getLatitude()) : null;
        Double longitude = requiresLocation ? normalizeLongitude(request.getLongitude()) : null;
        validateCoordinatesPair(latitude, longitude);
        Set<Category> categories = resolveCategoriesForRegistration(request);

        User existingUser = userRepository.findByEmailAndDeletedAtIsNull(normalizedEmail).orElse(null);
        if (existingUser != null) {
            burnPasswordWorkFactor(rawPassword);
            throw new AuthApiException(
                HttpStatus.CONFLICT,
                "EMAIL_ALREADY_EXISTS",
                EMAIL_ALREADY_EXISTS_MESSAGE
            );
        }
        RegistrationPhoneVerificationService.VerificationResult phoneVerification =
            registrationPhoneVerificationService.resolveOptionalForRegistration(
                request.getPhoneNumber(),
                request.getPhoneVerificationToken()
            );
        ensurePhoneAvailable(phoneVerification.phoneNumber(), null);

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(normalizedEmail);
        user.setPhoneNumber(phoneVerification.phoneNumber());
        user.setPassword(passwordEncoder.encode(oauthIdentity == null ? rawPassword : UUID.randomUUID().toString()));
        user.setRole(UserRole.PROFESSIONAL);
        if (oauthIdentity != null) {
            user.setProvider(oauthIdentity.provider());
            user.setProviderId(oauthIdentity.providerId());
            user.setAvatar(oauthIdentity.avatar());
            user.setEmailVerifiedAt(LocalDateTime.now());
        }
        if (phoneVerification.verified()) {
            user.setPhoneVerifiedAt(LocalDateTime.now());
        }
        User savedUser;
        try {
            savedUser = userRepository.save(user);
        } catch (DataIntegrityViolationException exception) {
            burnPasswordWorkFactor(rawPassword);
            User duplicatedUser = userRepository.findByEmailAndDeletedAtIsNull(normalizedEmail).orElse(null);
            if (duplicatedUser != null) {
                throw new AuthApiException(
                    HttpStatus.CONFLICT,
                    "EMAIL_ALREADY_EXISTS",
                    EMAIL_ALREADY_EXISTS_MESSAGE
                );
            }
            throw exception;
        }

        professionalAccountProfileGateway.createRegisteredProfile(
            savedUser,
            new ProfessionalProfileRegistrationCommand(
                categories,
                resolvePrimaryCategoryName(categories, request.getRubro()),
                country,
                city,
                fullAddress,
                location,
                latitude,
                longitude,
                tipoCliente
            )
        );
    }

    @Transactional
    public AuthMeResponse activateProfessionalProfile(
        String rawUserId,
        ActivateProfessionalProfileRequest request,
        AuthContextType activeContextType,
        String activeProfessionalId,
        String activeWorkerId
    ) {
        User user = loadUserByRawId(rawUserId);
        if (user.getRole() != UserRole.PROFESSIONAL) {
            user.setRole(UserRole.PROFESSIONAL);
            user = userRepository.save(user);
        }
        String tipoCliente = normalizeTipoCliente(request.getTipoCliente());
        boolean requiresLocation = requiresProfessionalLocation(tipoCliente);
        String country = normalizeLocationPart(request.getCountry(), requiresLocation, "country");
        String city = normalizeLocationPart(request.getCity(), requiresLocation, "city");
        String fullAddress = normalizeLocationPart(request.getFullAddress(), requiresLocation, "fullAddress");
        String location = requiresLocation ? composeLocation(fullAddress, city, country) : null;
        Double latitude = requiresLocation ? normalizeLatitude(request.getLatitude()) : null;
        Double longitude = requiresLocation ? normalizeLongitude(request.getLongitude()) : null;
        validateCoordinatesPair(latitude, longitude);
        Set<Category> categories = resolveCategories(request.getCategorySlugs(), request.getRubro());

        ProfessionalProfile profile = professionalAccountProfileGateway.activateProfile(
            user,
            new ProfessionalProfileRegistrationCommand(
                categories,
                resolvePrimaryCategoryName(categories, request.getRubro()),
                country,
                city,
                fullAddress,
                location,
                latitude,
                longitude,
                tipoCliente
            )
        );

        return getMe(
            String.valueOf(user.getId()),
            activeContextType,
            activeProfessionalId == null ? String.valueOf(profile.getId()) : activeProfessionalId,
            activeWorkerId
        );
    }

    /**
     * Ejecuta la logica de login profesional manteniendola encapsulada en este componente.
     */
    @Transactional
    public AuthResult loginProfesional(LoginRequest request, SessionContext sessionContext) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(request.getEmail().trim().toLowerCase(Locale.ROOT))
            .orElse(null);
        if (user == null) {
            burnPasswordWorkFactor(request.getPassword());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        AuthContextDescriptor professionalContext = resolveRequiredContext(user, AuthContextType.PROFESSIONAL, null, null);
        return issueTokens(user, toUserResponse(user), sessionContext, professionalContext);
    }

    /**
     * Ejecuta la logica de login cliente manteniendola encapsulada en este componente.
     */
    @Transactional
    public AuthResult loginCliente(LoginRequest request, SessionContext sessionContext) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(request.getEmail().trim().toLowerCase(Locale.ROOT))
            .orElse(null);
        if (user == null) {
            burnPasswordWorkFactor(request.getPassword());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        AuthContextDescriptor clientContext = resolveRequiredContext(user, AuthContextType.CLIENT, null, null);
        return issueTokens(user, toUserResponse(user), sessionContext, clientContext);
    }

    /**
     * Ejecuta la logica de login with o autenticacion manteniendola encapsulada en este componente.
     */
    @Transactional
    public OAuthResult loginWithOAuth(OAuthLoginRequest request, SessionContext sessionContext) {
        OAuthUserInfo userInfo = oAuthService.verify(request);
        String normalizedProvider = normalizeOAuthProvider(userInfo.provider());
        String providerId = normalizeOAuthValue(userInfo.providerId());
        String email = normalizeOAuthEmail(userInfo.email());
        UserRole desiredRole = normalizeDesiredOAuthRole(request.getDesiredRole());
        OAuthAuthAction authAction = normalizeOAuthAuthAction(request.getAuthAction());

        if (authAction == OAuthAuthAction.REGISTER && desiredRole == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "desiredRole es obligatorio para registro OAuth");
        }

        if (providerId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token OAuth sin providerId");
        }

        User user = null;
        if (email != null) {
            user = userRepository.findByEmailAndDeletedAtIsNull(email).orElse(null);
            if (user != null) {
                String existingProvider = normalizeOAuthValue(user.getProvider());
                if (existingProvider != null && !normalizedProvider.equals(existingProvider.toLowerCase(Locale.ROOT))) {
                    throw new OAuthProviderMismatchException();
                }
            }
        }
        if (user == null) {
            user = userRepository.findByProviderAndProviderIdAndDeletedAtIsNull(normalizedProvider, providerId)
                .orElse(null);
        }

        if (user == null) {
            if (authAction == OAuthAuthAction.LOGIN) {
                throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "No existe una cuenta asociada. Registrate primero."
                );
            }
            if ("apple".equals(normalizedProvider) && email == null) {
                throw new AppleEmailRequiredFirstLoginException();
            }
            if (email == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OAuth email es obligatorio");
            }
            if (authAction == OAuthAuthAction.REGISTER && desiredRole == UserRole.PROFESSIONAL) {
                return new OAuthResult(null, buildProfessionalOAuthPendingRegistration(
                    normalizedProvider,
                    providerId,
                    email,
                    userInfo
                ));
            }
            user = new User();
            user.setRole(desiredRole);
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setFullName(resolveOAuthDisplayName(userInfo.name(), user.getEmail()));
            user.setProvider(normalizedProvider);
            user.setProviderId(providerId);
            user.setAvatar(normalizeOAuthValue(userInfo.avatar()));
            applyTrustedEmailVerification(user, normalizedProvider);
            user = userRepository.save(user);
        } else {
            boolean professionalOnboardingRegister =
                authAction == OAuthAuthAction.REGISTER && desiredRole == UserRole.PROFESSIONAL;

            boolean changed = false;
            if (authAction == OAuthAuthAction.REGISTER) {
                if (professionalOnboardingRegister) {
                    throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        isProfessionalUser(user) ? PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE : CLIENT_ACCOUNT_EXISTS_FOR_PROFESSIONAL_MESSAGE
                    );
                } else {
                    if (desiredRole == UserRole.USER && !isClientUser(user)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE);
                    }
                    if (isProfessionalUser(user)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE);
                    }
                    throw new ResponseStatusException(HttpStatus.CONFLICT, CLIENT_ACCOUNT_EXISTS_MESSAGE);
                }
            }

            if (authAction == OAuthAuthAction.LOGIN && desiredRole == UserRole.PROFESSIONAL && !isProfessionalUser(user)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, CLIENT_ACCOUNT_EXISTS_FOR_PROFESSIONAL_MESSAGE);
            }
            if ((user.getProvider() == null || user.getProvider().isBlank()) || normalizedProvider.equals(user.getProvider())) {
                if (!normalizedProvider.equals(user.getProvider())) {
                    user.setProvider(normalizedProvider);
                    changed = true;
                }
                if (!providerId.equals(user.getProviderId())) {
                    user.setProviderId(providerId);
                    changed = true;
                }
            }
            String avatar = normalizeOAuthValue(userInfo.avatar());
            if (avatar != null && !avatar.equals(user.getAvatar())) {
                user.setAvatar(avatar);
                changed = true;
            }
            if (applyTrustedEmailVerification(user, normalizedProvider)) {
                changed = true;
            }
            if (changed) {
                user = userRepository.save(user);
            }
        }

        UserRole initialContextRole =
            authAction == OAuthAuthAction.REGISTER && desiredRole == UserRole.PROFESSIONAL && !isProfessionalUser(user)
                ? UserRole.USER
                : desiredRole;
        return new OAuthResult(
            issueTokens(user, toUserResponse(user), sessionContext, resolveOAuthInitialContext(user, initialContextRole)),
            null
        );
    }

    /**
     * Refresca sesion para mantener datos derivados o metricas al dia.
     */
    @Transactional(noRollbackFor = AuthApiException.class)
    public AuthResult refreshSession(String refreshToken, SessionContext sessionContext) {
        return refreshSession(refreshToken, sessionContext, null);
    }

    /**
     * Refresca sesion preservando el contexto activo cuando el access token vigente lo expone.
     */
    @Transactional(noRollbackFor = AuthApiException.class)
    public AuthResult refreshSession(
        String refreshToken,
        SessionContext sessionContext,
        AuthenticatedTokenDetails activeTokenDetails
    ) {
        if (refreshToken == null || refreshToken.isBlank()) {
            auditRefreshFailure(null, null, sessionContext, "missing_refresh_token");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_INVALID", "Refresh token faltante.");
        }

        String tokenHash = hashToken(refreshToken);
        LocalDateTime now = LocalDateTime.now();

        SessionService.TrackedRefreshTokenMatch trackedMatch = sessionService.findTrackedRefreshTokenMatch(tokenHash)
            .orElse(null);
        if (trackedMatch != null) {
            return refreshTrackedSession(trackedMatch, sessionContext, now, activeTokenDetails);
        }

        RefreshToken stored = refreshTokenRepository.findByToken(tokenHash).orElse(null);
        if (stored != null) {
            if (!allowLegacyRefreshFallback) {
                Long userId = stored.getUser() == null ? null : stored.getUser().getId();
                authAuditService.log(
                    AuthAuditEventType.LEGACY_TOKEN_REJECTED,
                    AuthAuditStatus.FAILURE,
                    userId,
                    null,
                    sessionContext == null ? null : sessionContext.ipAddress(),
                    sessionContext == null ? null : sessionContext.userAgent(),
                    Map.of("type", "legacy_refresh")
                );
                auditRefreshFailure(userId, null, sessionContext, "legacy_refresh_rejected");
                throw new AuthApiException(
                    HttpStatus.UNAUTHORIZED,
                    "LEGACY_TOKEN_REJECTED",
                    "La sesión requiere volver a iniciar sesión."
                );
            }
            return migrateLegacyRefreshToken(stored, sessionContext, now, activeTokenDetails);
        }

        auditRefreshFailure(null, null, sessionContext, "refresh_token_invalid");
        throw new AuthApiException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_INVALID", "Refresh token inválido.");
    }

    /**
     * Resuelve refresh owner ID normalizando entradas, defaults y casos borde.
     */
    @Transactional(readOnly = true)
    public String resolveRefreshOwnerId(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return null;
        }
        String tokenHash = hashToken(refreshToken);
        SessionService.TrackedRefreshTokenMatch trackedMatch = sessionService.findTrackedRefreshTokenMatch(tokenHash)
            .orElse(null);
        if (trackedMatch != null && trackedMatch.session().getUser() != null) {
            return String.valueOf(trackedMatch.session().getUser().getId());
        }
        if (!allowLegacyRefreshFallback) {
            return null;
        }
        RefreshToken stored = refreshTokenRepository.findByToken(tokenHash).orElse(null);
        if (stored == null || stored.getUser() == null) {
            return null;
        }
        return String.valueOf(stored.getUser().getId());
    }

    /**
     * Ejecuta la logica de logout manteniendola encapsulada en este componente.
     */
    @Transactional
    public void logout(String refreshToken, String rawUserId, String currentSessionId) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            String tokenHash = hashToken(refreshToken);
            if (sessionService.findSessionByRefreshTokenHash(tokenHash).isPresent()) {
                sessionService.revokeSessionByRefreshToken(tokenHash, sessionService.revokeReasonLogout());
                return;
            }
            refreshTokenRepository.findByToken(tokenHash).ifPresent(stored -> {
                if (stored.getRevokedAt() == null) {
                    stored.setRevokedAt(LocalDateTime.now());
                    refreshTokenRepository.save(stored);
                }
            });
            return;
        }

        if (rawUserId != null && currentSessionId != null) {
            sessionService.revokeSessionByIdForUser(parseUserId(rawUserId), currentSessionId, sessionService.revokeReasonLogout());
        }
    }

    /**
     * Ejecuta la logica de logout todos sesiones manteniendola encapsulada en este componente.
     */
    @Transactional
    public void logoutAllSessions(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        sessionService.incrementSessionVersion(userId);
        sessionService.revokeAllSessionsForUser(userId, sessionService.revokeReasonLogoutAll());
    }

    /**
     * Devuelve el listado de sesiones aplicando permisos y filtros del caso de uso.
     */
    @Transactional(readOnly = true)
    public List<AuthSessionResponse> listSessions(String rawUserId, String currentSessionId) {
        return sessionService.listSessions(parseUserId(rawUserId), currentSessionId);
    }

    /**
     * Ejecuta la logica de revoke sesion manteniendola encapsulada en este componente.
     */
    @Transactional
    public void revokeSession(String rawUserId, String sessionId) {
        sessionService.revokeSessionByIdForUser(
            parseUserId(rawUserId),
            sessionId,
            sessionService.revokeReasonSessionRevoked()
        );
    }

    /**
     * Evalua issue tokens y devuelve una decision booleana para el llamador.
     */
    private AuthResult issueTokens(User user, UserResponse userResponse, SessionContext sessionContext) {
        return issueTokens(user, userResponse, sessionContext, resolveDefaultContext(user));
    }

    /**
     * Evalua issue tokens y devuelve una decision booleana para el llamador.
     */
    private AuthResult issueTokens(
        User user,
        UserResponse userResponse,
        SessionContext sessionContext,
        AuthContextDescriptor context
    ) {
        String userId = String.valueOf(user.getId());
        user.setLastLoginAt(LocalDateTime.now());
        user.setLastLoginIp(normalizeIpAddress(sessionContext == null ? null : sessionContext.ipAddress()));
        if (user.getSessionVersion() == null || user.getSessionVersion() < 1) {
            user.setSessionVersion(1);
        }
        User savedUser = userRepository.save(user);
        SessionTokenIssue sessionToken = createSessionToken(savedUser, sessionContext);
        if (context != null) {
            sessionService.updateActiveContext(sessionToken.session(), context);
        }
        String accessToken = createAccessToken(
            userId,
            savedUser.getEmail(),
            savedUser.getRole(),
            sessionToken.session().getId(),
            savedUser.getSessionVersion(),
            context
        );
        authAuditService.log(
            AuthAuditEventType.LOGIN_SUCCESS,
            AuthAuditStatus.SUCCESS,
            savedUser.getId(),
            sessionToken.session().getId(),
            sessionContext == null ? null : sessionContext.ipAddress(),
            sessionContext == null ? null : sessionContext.userAgent(),
            Map.of(
                "role", savedUser.getRole().name(),
                "sessionType", sessionToken.session().getSessionType().name()
            )
        );
        return new AuthResult(
            accessToken,
            sessionToken.rawToken(),
            userResponse,
            savedUser.getRole(),
            toAuthSessionResponse(sessionToken.session(), true)
        );
    }

    /**
     * Crea acceso token validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private String createAccessToken(String userId, String email, UserRole role, String sessionId, Integer sessionVersion) {
        return createAccessToken(userId, email, role, sessionId, sessionVersion, null);
    }

    /**
     * Crea acceso token validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private String createAccessToken(
        String userId,
        String email,
        UserRole role,
        String sessionId,
        Integer sessionVersion,
        AuthContextDescriptor context
    ) {
        Date now = new Date();
        Date expiresAt = Date.from(Instant.now().plus(jwtExpirationMinutes, ChronoUnit.MINUTES));
        com.auth0.jwt.JWTCreator.Builder builder = JWT.create()
            .withSubject(userId)
            .withClaim("email", email)
            .withClaim("role", role.name())
            .withIssuer(jwtIssuer)
            .withIssuedAt(now)
            .withExpiresAt(expiresAt);
        if (sessionId != null && !sessionId.isBlank()) {
            builder.withClaim("sid", sessionId);
        }
        if (sessionVersion != null) {
            builder.withClaim("sv", sessionVersion);
        }
        if (context != null && context.type() != null) {
            builder.withClaim("ctx", context.type().name());
            if (context.professionalId() != null && !context.professionalId().isBlank()) {
                builder.withClaim("pid", context.professionalId());
            }
            if (context.workerId() != null && !context.workerId().isBlank()) {
                builder.withClaim("wid", context.workerId());
            }
        }
        return builder.sign(jwtAlgorithm);
    }

    /**
     * Refresca tracked sesion para mantener datos derivados o metricas al dia.
     */
    private AuthResult refreshTrackedSession(
        SessionService.TrackedRefreshTokenMatch trackedMatch,
        SessionContext sessionContext,
        LocalDateTime now,
        AuthenticatedTokenDetails activeTokenDetails
    ) {
        AuthSession session = trackedMatch.session();
        if (session.getRevokedAt() != null) {
            auditRefreshFailure(sessionUserId(session), session.getId(), sessionContext, "session_revoked");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "SESSION_REVOKED", "La sesión ya no es válida.");
        }
        if (session.getExpiresAt() == null) {
            sessionService.revokeSession(session, "SESSION_INVALID");
            auditRefreshFailure(sessionUserId(session), session.getId(), sessionContext, "session_missing_expiry");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "La sesión ya no es válida.");
        }
        if (session.getExpiresAt().isBefore(now)) {
            sessionService.revokeSession(session, "EXPIRED");
            auditRefreshFailure(sessionUserId(session), session.getId(), sessionContext, "session_expired");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", "La sesión expiró.");
        }

        User user = session.getUser();
        if (user == null || user.getDeletedAt() != null) {
            sessionService.revokeSession(session, "USER_NOT_FOUND");
            auditRefreshFailure(sessionUserId(session), session.getId(), sessionContext, "user_not_found");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "La sesión ya no es válida.");
        }
        if (user.getRole() == null) {
            sessionService.revokeSession(session, "SESSION_INVALID");
            auditRefreshFailure(user.getId(), session.getId(), sessionContext, "session_missing_role");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "La sesión ya no es válida.");
        }
        if (session.getSessionType() == null) {
            session.setSessionType(resolveSessionType(sessionContext));
        }

        if (trackedMatch.matchType() == SessionService.RefreshTokenMatchType.PREVIOUS) {
            handleRefreshTokenReuse(session, sessionContext);
            throw new AuthApiException(
                HttpStatus.UNAUTHORIZED,
                "SESSION_COMPROMISED",
                "Detectamos reutilización del refresh token. Iniciá sesión nuevamente."
            );
        }

        if (user.getSessionVersion() == null || user.getSessionVersion() < 1) {
            user.setSessionVersion(1);
            userRepository.save(user);
        }

        String rawRefreshToken = generateRefreshToken();
        LocalDateTime newExpiry = now.plusDays(refreshTokenDays);
        AuthSession rotated = sessionService.rotateSession(
            session,
            hashToken(rawRefreshToken),
            sessionContext == null ? null : sessionContext.userAgent(),
            sessionContext == null ? null : sessionContext.ipAddress(),
            newExpiry
        );
        AuthContextDescriptor refreshContext = resolveRefreshContext(user, activeTokenDetails, rotated);
        if (refreshContext != null) {
            sessionService.updateActiveContext(rotated, refreshContext);
        }
        String accessToken = createAccessToken(
            String.valueOf(user.getId()),
            user.getEmail(),
            user.getRole(),
            rotated.getId(),
            user.getSessionVersion(),
            refreshContext
        );
        AuthResult result = new AuthResult(
            accessToken,
            rawRefreshToken,
            toUserResponse(user),
            user.getRole(),
            toAuthSessionResponse(rotated, true)
        );
        auditRefreshSuccess(user.getId(), rotated.getId(), sessionContext, "session_refresh");
        return result;
    }

    /**
     * Ejecuta la logica de migrate legacy refresh token manteniendola encapsulada en este componente.
     */
    private AuthResult migrateLegacyRefreshToken(
        RefreshToken stored,
        SessionContext sessionContext,
        LocalDateTime now,
        AuthenticatedTokenDetails activeTokenDetails
    ) {
        if (stored.getRevokedAt() != null) {
            Long userId = stored.getUser() == null ? null : stored.getUser().getId();
            auditRefreshFailure(userId, null, sessionContext, "legacy_refresh_revoked");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "SESSION_REVOKED", "La sesión ya no es válida.");
        }
        if (stored.getExpiryDate() == null) {
            stored.setRevokedAt(now);
            refreshTokenRepository.save(stored);
            Long userId = stored.getUser() == null ? null : stored.getUser().getId();
            auditRefreshFailure(userId, null, sessionContext, "legacy_refresh_missing_expiry");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "La sesión ya no es válida.");
        }
        if (stored.getExpiryDate().isBefore(now)) {
            stored.setRevokedAt(now);
            refreshTokenRepository.save(stored);
            Long userId = stored.getUser() == null ? null : stored.getUser().getId();
            auditRefreshFailure(userId, null, sessionContext, "legacy_refresh_expired");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", "La sesión expiró.");
        }

        User user = stored.getUser();
        if (user == null || user.getDeletedAt() != null) {
            stored.setRevokedAt(now);
            refreshTokenRepository.save(stored);
            auditRefreshFailure(null, null, sessionContext, "legacy_user_not_found");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "La sesión ya no es válida.");
        }
        if (user.getRole() == null) {
            stored.setRevokedAt(now);
            refreshTokenRepository.save(stored);
            auditRefreshFailure(user.getId(), null, sessionContext, "legacy_user_missing_role");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "La sesión ya no es válida.");
        }

        if (user.getSessionVersion() == null || user.getSessionVersion() < 1) {
            user.setSessionVersion(1);
            userRepository.save(user);
        }

        String rawRefreshToken = generateRefreshToken();
        SessionService.LegacyRefreshMigrationResult migration = sessionService.migrateLegacyRefreshToken(
            stored,
            hashToken(rawRefreshToken),
            resolveSessionType(sessionContext),
            sessionContext == null ? null : sessionContext.userAgent(),
            sessionContext == null ? null : sessionContext.ipAddress(),
            now.plusDays(refreshTokenDays)
        );
        AuthContextDescriptor refreshContext = resolveRefreshContext(user, activeTokenDetails, migration.session());
        if (refreshContext != null) {
            sessionService.updateActiveContext(migration.session(), refreshContext);
        }
        String accessToken = createAccessToken(
            String.valueOf(user.getId()),
            user.getEmail(),
            user.getRole(),
            migration.session().getId(),
            user.getSessionVersion(),
            refreshContext
        );
        AuthResult result = new AuthResult(
            accessToken,
            rawRefreshToken,
            toUserResponse(user),
            user.getRole(),
            toAuthSessionResponse(migration.session(), true)
        );
        auditRefreshSuccess(user.getId(), migration.session().getId(), sessionContext, "legacy_refresh_migration");
        return result;
    }

    /**
     * Crea refresh token validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private RefreshTokenIssue createRefreshToken(User user) {
        String rawToken = generateRefreshToken();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(hashToken(rawToken));
        refreshToken.setExpiryDate(LocalDateTime.now().plusDays(refreshTokenDays));
        RefreshToken saved = refreshTokenRepository.save(refreshToken);
        return new RefreshTokenIssue(rawToken, saved);
    }

    /**
     * Crea sesion token validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private SessionTokenIssue createSessionToken(User user, SessionContext sessionContext) {
        String rawToken = generateRefreshToken();
        AuthSession session = sessionService.createSession(
            user,
            resolveSessionType(sessionContext),
            hashToken(rawToken),
            null,
            sessionContext == null ? null : sessionContext.userAgent(),
            sessionContext == null ? null : sessionContext.ipAddress(),
            LocalDateTime.now().plusDays(refreshTokenDays)
        );
        return new SessionTokenIssue(rawToken, session);
    }

    /**
     * Genera refresh token con formato estable para uso interno o externo.
     */
    private String generateRefreshToken() {
        byte[] randomBytes = new byte[64];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    /**
     * Evalua hash token y devuelve una decision booleana para el llamador.
     */
    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String value = rawToken + refreshTokenPepper;
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo hashear el refresh token", ex);
        }
    }

    /**
     * Ejecuta la logica de burn contrasena work factor manteniendola encapsulada en este componente.
     */
    private void burnPasswordWorkFactor(String rawPassword) {
        String candidate = rawPassword == null ? "" : rawPassword;
        passwordEncoder.matches(candidate, dummyPasswordHash);
    }

    /**
     * Carga la seccion usuario by raw ID desde base de datos o datos agregados y la deja lista para la respuesta.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    private User loadUserByRawId(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        return userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
    }

    /**
     * Parsea usuario ID y convierte errores de formato en errores controlados.
     */
    private Long parseUserId(String rawUserId) {
        try {
            return Long.valueOf(rawUserId);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido");
        }
    }


    /**
     * Resuelve sesion tipo normalizando entradas, defaults y casos borde.
     */
    private AuthSessionType resolveSessionType(SessionContext sessionContext) {
        if (sessionContext == null || sessionContext.sessionType() == null) {
            return AuthSessionType.WEB;
        }
        return sessionContext.sessionType();
    }

    /**
     * Convierte datos internos al formato autenticacion sesion respuesta esperado por el consumidor.
     */
    private AuthSessionResponse toAuthSessionResponse(AuthSession session, boolean current) {
        return new AuthSessionResponse(
            session.getId(),
            normalizeSessionTypeName(session),
            session.getDeviceLabel(),
            session.getUserAgent(),
            session.getIpAddress(),
            session.getCreatedAt(),
            session.getLastSeenAt(),
            session.getExpiresAt(),
            session.getRevokedAt(),
            session.getRevokeReason(),
            current
        );
    }

    /**
     * Normaliza ip address para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeIpAddress(String ipAddress) {
        if (ipAddress == null) {
            return null;
        }
        String trimmed = ipAddress.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        return trimmed.length() <= 64 ? trimmed : trimmed.substring(0, 64);
    }

    /**
     * Normaliza sesion tipo nombre para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeSessionTypeName(AuthSession session) {
        AuthSessionType sessionType = session == null ? null : session.getSessionType();
        return (sessionType == null ? AuthSessionType.WEB : sessionType).name();
    }

    /**
     * Procesa refresh token reuse y coordina la respuesta del flujo.
     */
    private void handleRefreshTokenReuse(AuthSession session, SessionContext sessionContext) {
        AuthSession compromisedSession = sessionService.markSessionCompromised(
            session,
            sessionService.revokeReasonRefreshReuse()
        );
        Long userId = sessionUserId(compromisedSession);
        String sessionId = compromisedSession.getId();
        Map<String, String> metadata = Map.of(
            "sessionId", sessionId,
            "reason", sessionService.revokeReasonRefreshReuse()
        );
        authAuditService.log(
            AuthAuditEventType.REFRESH_TOKEN_REUSE_DETECTED,
            AuthAuditStatus.FAILURE,
            userId,
            sessionId,
            sessionContext == null ? null : sessionContext.ipAddress(),
            sessionContext == null ? null : sessionContext.userAgent(),
            metadata
        );
        authAuditService.log(
            AuthAuditEventType.SESSION_REVOKED_COMPROMISED,
            AuthAuditStatus.FAILURE,
            userId,
            sessionId,
            sessionContext == null ? null : sessionContext.ipAddress(),
            sessionContext == null ? null : sessionContext.userAgent(),
            metadata
        );
        auditRefreshFailure(userId, sessionId, sessionContext, "refresh_token_reuse_detected");
    }

    /**
     * Ejecuta la logica de audit refresh success manteniendola encapsulada en este componente.
     */
    private void auditRefreshSuccess(Long userId, String sessionId, SessionContext sessionContext, String mode) {
        authAuditService.log(
            AuthAuditEventType.REFRESH_SUCCESS,
            AuthAuditStatus.SUCCESS,
            userId,
            sessionId,
            sessionContext == null ? null : sessionContext.ipAddress(),
            sessionContext == null ? null : sessionContext.userAgent(),
            Map.of("mode", mode)
        );
    }

    /**
     * Ejecuta la logica de audit refresh failure manteniendola encapsulada en este componente.
     */
    private void auditRefreshFailure(Long userId, String sessionId, SessionContext sessionContext, String reason) {
        authAuditService.log(
            AuthAuditEventType.REFRESH_FAILURE,
            AuthAuditStatus.FAILURE,
            userId,
            sessionId,
            sessionContext == null ? null : sessionContext.ipAddress(),
            sessionContext == null ? null : sessionContext.userAgent(),
            Map.of("reason", reason)
        );
    }

    /**
     * Ejecuta la logica de sesion usuario ID manteniendola encapsulada en este componente.
     */
    private Long sessionUserId(AuthSession session) {
        if (session == null || session.getUser() == null) {
            return null;
        }
        return session.getUser().getId();
    }

    public ProfesionalProfileResponse getProfesionalProfile(String rawUserId) {
        User user = loadUserByRawId(rawUserId);
        ProfessionalProfile profile = professionalAccountProfileGateway.findByUserId(user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil profesional no encontrado"));
        if (!Boolean.TRUE.equals(profile.getActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Profesional inhabilitado");
        }

        EffectiveProfessionalPlan effectivePlan = effectiveProfessionalPlanService.resolveForProfessional(profile);
        return new ProfesionalProfileResponse(
            String.valueOf(user.getId()),
            profile.getSlug(),
            user.getFullName(),
            user.getEmail(),
            user.getEmailVerifiedAt() != null,
            user.getPhoneNumber(),
            user.getPhoneVerifiedAt() != null,
            profile.getRubro(),
            profile.getLocation(),
            profile.getCountry(),
            profile.getCity(),
            profile.getFullAddress(),
            profile.getLatitude(),
            profile.getLongitude(),
            profile.getTipoCliente(),
            profile.getLogoUrl(),
            toMediaPresentation(profile.getLogoPositionX(), profile.getLogoPositionY(), profile.getLogoZoom()),
            profile.getBannerUrl(),
            toMediaPresentation(profile.getBannerPositionX(), profile.getBannerPositionY(), profile.getBannerZoom()),
            profile.getInstagram(),
            profile.getFacebook(),
            profile.getTiktok(),
            profile.getWebsite(),
            profile.getWhatsapp(),
            profile.getPublicHeadline(),
            profile.getPublicAbout(),
            profile.getPublicPhotos(),
            mapCategories(profile.getCategories()),
            effectivePlan.code().name(),
            effectivePlan.entitlements(),
            user.getCreatedAt(),
            profile.getRating(),
            profile.getReviewsCount()
        );
    }

    /**
     * Convierte datos internos al formato media presentation esperado por el consumidor.
     */
    private MediaPresentationDto toMediaPresentation(Double positionX, Double positionY, Double zoom) {
        return new MediaPresentationDto(
            positionX != null ? positionX : 50d,
            positionY != null ? positionY : 50d,
            zoom != null ? zoom : 1d
        );
    }

    /**
     * Completa o autenticacion telefono y deja persistido el estado final del flujo.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Transactional
    public void completeOAuthPhone(String rawUserId, CompleteOAuthPhoneRequest request) {
        User user = loadUserByRawId(rawUserId);
        if (request == null || request.getPhoneNumber() == null || request.getPhoneNumber().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teléfono inválido");
        }
        RegistrationPhoneVerificationService.VerificationResult phoneVerification =
            registrationPhoneVerificationService.resolveForRegistration(
                request.getPhoneNumber(),
                request.getPhoneVerificationToken()
            );
        String normalizedPhone = phoneVerification.phoneNumber();

        String currentPhone = normalizePhoneNumber(user.getPhoneNumber());
        if (normalizedPhone.equals(currentPhone)) {
            if (phoneVerification.verified() && user.getPhoneVerifiedAt() == null) {
                user.setPhoneVerifiedAt(LocalDateTime.now());
                userRepository.save(user);
            }
            return;
        }

        ensurePhoneAvailable(normalizedPhone, user.getId());
        user.setPhoneNumber(normalizedPhone);
        user.setPhoneVerifiedAt(phoneVerification.verified() ? LocalDateTime.now() : null);
        userRepository.save(user);
    }

    public UserResponse getClienteProfile(String rawUserId) {
        User user = loadUserByRawId(rawUserId);
        return toUserResponse(user);
    }

    /**
     * Ejecuta la logica de ensure profesional usuario manteniendola encapsulada en este componente.
     */
    private void ensureProfessionalUser(User user) {
        if (!isProfessionalUser(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo profesionales");
        }
    }

    /**
     * Ejecuta la logica de ensure cliente usuario manteniendola encapsulada en este componente.
     */
    private void ensureClientUser(User user) {
        if (!isClientUser(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
    }

    /**
     * Evalua is profesional usuario y devuelve una decision booleana para el llamador.
     */
    private boolean isProfessionalUser(User user) {
        return user != null && user.getRole() == UserRole.PROFESSIONAL;
    }

    /**
     * Evalua is cliente usuario y devuelve una decision booleana para el llamador.
     */
    private boolean isClientUser(User user) {
        return user != null && user.getRole() == UserRole.USER;
    }

    /**
     * Convierte datos internos al formato usuario respuesta esperado por el consumidor.
     */
    private UserResponse toUserResponse(User user) {
        return new UserResponse(
            String.valueOf(user.getId()),
            user.getEmail(),
            user.getFullName(),
            user.getEmailVerifiedAt() != null,
            user.getPhoneNumber(),
            user.getPhoneVerifiedAt() != null,
            user.getCreatedAt()
        );
    }

    /**
     * Normaliza telefono number para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizePhoneNumber(String value) {
        String normalized = normalizeOAuthValue(value);
        if (normalized == null) {
            return null;
        }
        String collapsed = normalized
            .replace(" ", "")
            .replace("-", "")
            .replace("(", "")
            .replace(")", "");
        if (collapsed.startsWith("+")) {
            String digits = collapsed.substring(1).replaceAll("\\D", "");
            String candidate = "+" + digits;
            return digits.length() >= 8 && digits.length() <= 20 ? candidate : null;
        }
        String digits = collapsed.replaceAll("\\D", "");
        return digits.length() >= 8 && digits.length() <= 20 ? digits : null;
    }

    private void ensurePhoneAvailable(String normalizedPhone, Long currentUserId) {
        if (normalizedPhone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teléfono inválido");
        }
        User owner = userRepository
            .findFirstByPhoneNumberAndDeletedAtIsNull(normalizedPhone)
            .orElse(null);
        if (owner == null) {
            return;
        }
        if (isSameUser(owner, currentUserId)) {
            return;
        }
        throw new AuthApiException(
            HttpStatus.CONFLICT,
            "PHONE_ALREADY_IN_USE",
            PHONE_ALREADY_IN_USE_MESSAGE
        );
    }

    private boolean isSameUser(User owner, Long currentUserId) {
        return currentUserId != null && owner != null && owner.getId() != null && owner.getId().equals(currentUserId);
    }

    private String normalizeEmailForAvailability(String rawEmail) {
        String normalized = normalizeOAuthValue(rawEmail);
        return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
    }

    /**
     * Aplica trusted email verification sobre el modelo actual manteniendo consistencia.
     */
    private boolean applyTrustedEmailVerification(User user, String normalizedProvider) {
        if (user == null || normalizedProvider == null) {
            return false;
        }
        if (!"google".equals(normalizedProvider) || user.getEmailVerifiedAt() != null) {
            return false;
        }
        user.setEmailVerifiedAt(LocalDateTime.now());
        return true;
    }

    /**
     * Normaliza o autenticacion email para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeOAuthEmail(String email) {
        String normalized = normalizeOAuthValue(email);
        if (normalized == null) {
            return null;
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

    /**
     * Normaliza o autenticacion proveedor para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeOAuthProvider(String provider) {
        String normalized = normalizeOAuthValue(provider);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provider OAuth inválido");
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

    /**
     * Normaliza desired o autenticacion rol para evitar variantes vacias, invalidas o inconsistentes.
     */
    private UserRole normalizeDesiredOAuthRole(String rawRole) {
        String normalized = normalizeOAuthValue(rawRole);
        if (normalized == null) {
            return null;
        }
        try {
            return UserRole.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "desiredRole inválido");
        }
    }

    /**
     * Normaliza o autenticacion autenticacion action para evitar variantes vacias, invalidas o inconsistentes.
     */
    private OAuthAuthAction normalizeOAuthAuthAction(String rawAction) {
        String normalized = normalizeOAuthValue(rawAction);
        if (normalized == null) {
            return OAuthAuthAction.LOGIN;
        }
        try {
            return OAuthAuthAction.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "authAction inválido");
        }
    }

    /**
     * Normaliza o autenticacion value para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeOAuthValue(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    /**
     * Resuelve o autenticacion display name normalizando entradas, defaults y casos borde.
     */
    private String resolveOAuthDisplayName(String name, String email) {
        String normalizedName = normalizeOAuthValue(name);
        if (normalizedName != null) {
            return normalizedName;
        }
        int atIndex = email == null ? -1 : email.indexOf('@');
        if (atIndex > 0) {
            return email.substring(0, atIndex);
        }
        return "Usuario";
    }

    private OAuthPendingRegistrationResponse buildProfessionalOAuthPendingRegistration(
        String provider,
        String providerId,
        String email,
        OAuthUserInfo userInfo
    ) {
        String fullName = resolveOAuthDisplayName(userInfo.name(), email);
        String avatar = normalizeOAuthValue(userInfo.avatar());
        JWTCreator.Builder tokenBuilder = JWT.create()
            .withIssuer(jwtIssuer)
            .withSubject(email)
            .withClaim("typ", PROFESSIONAL_OAUTH_REGISTRATION_TOKEN_TYPE)
            .withClaim("provider", provider)
            .withClaim("providerId", providerId)
            .withClaim("email", email)
            .withClaim("fullName", fullName)
            .withIssuedAt(new Date())
            .withExpiresAt(Date.from(Instant.now().plus(10, ChronoUnit.MINUTES)));
        if (avatar != null) {
            tokenBuilder.withClaim("avatar", avatar);
        }
        String token = tokenBuilder.sign(jwtAlgorithm);
        return new OAuthPendingRegistrationResponse(
            true,
            token,
            new UserResponse(null, email, fullName, true, null, false, null)
        );
    }

    private ProfessionalOAuthRegistrationIdentity resolveProfessionalOAuthRegistrationIdentity(
        String rawToken,
        String expectedEmail
    ) {
        String token = normalizeOAuthValue(rawToken);
        if (token == null) {
            return null;
        }
        try {
            JWTVerifier verifier = JWT.require(jwtAlgorithm)
                .withIssuer(jwtIssuer)
                .withClaim("typ", PROFESSIONAL_OAUTH_REGISTRATION_TOKEN_TYPE)
                .build();
            DecodedJWT decoded = verifier.verify(token);
            String email = normalizeOAuthEmail(decoded.getClaim("email").asString());
            String provider = normalizeOAuthProvider(decoded.getClaim("provider").asString());
            String providerId = normalizeOAuthValue(decoded.getClaim("providerId").asString());
            if (email == null || !email.equals(expectedEmail) || providerId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token OAuth de registro inválido");
            }
            return new ProfessionalOAuthRegistrationIdentity(
                provider,
                providerId,
                email,
                resolveOAuthDisplayName(decoded.getClaim("fullName").asString(), email),
                normalizeOAuthValue(decoded.getClaim("avatar").asString())
            );
        } catch (JWTVerificationException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token OAuth de registro inválido");
        }
    }

    /**
     * Ejecuta la logica de ensure profesional perfil manteniendola encapsulada en este componente.
     */
    private ProfessionalProfile ensureProfessionalProfile(User user) {
        return professionalAccountProfileGateway.loadOrBootstrapProfile(user);
    }

    private enum OAuthAuthAction {
        LOGIN,
        REGISTER
    }

    /**
     * Normaliza tipo cliente para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeTipoCliente(String rawTipoCliente) {
        if (rawTipoCliente == null) return "";
        return rawTipoCliente.trim().toUpperCase();
    }

    /**
     * Exige s profesional location y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    private boolean requiresProfessionalLocation(String tipoCliente) {
        return "LOCAL".equals(tipoCliente);
    }

    /**
     * Normaliza location para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeLocation(String rawLocation) {
        if (rawLocation == null) return null;
        String trimmed = rawLocation.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    /**
     * Normaliza location part para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeLocationPart(String rawValue, boolean required, String fieldName) {
        String normalized = normalizeLocation(rawValue);
        if (normalized == null && required) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " es obligatorio");
        }
        return normalized;
    }


    /**
     * Ejecuta la logica de compose location manteniendola encapsulada en este componente.
     */
    private String composeLocation(String fullAddress, String city, String country) {
        return String.join(", ", fullAddress.trim(), city.trim(), country.trim());
    }

    /**
     * Valida coordinates pair y lanza un error controlado si no cumple el contrato.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    private void validateCoordinatesPair(Double latitude, Double longitude) {
        if ((latitude == null) == (longitude == null)) {
            return;
        }
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "latitude y longitude deben enviarse juntas"
        );
    }

    /**
     * Normaliza latitude para evitar variantes vacias, invalidas o inconsistentes.
     */
    private Double normalizeLatitude(Double rawLatitude) {
        if (rawLatitude == null) {
            return null;
        }
        if (rawLatitude < -90d || rawLatitude > 90d) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "latitude fuera de rango");
        }
        return rawLatitude;
    }

    /**
     * Normaliza longitude para evitar variantes vacias, invalidas o inconsistentes.
     */
    private Double normalizeLongitude(Double rawLongitude) {
        if (rawLongitude == null) {
            return null;
        }
        if (rawLongitude < -180d || rawLongitude > 180d) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "longitude fuera de rango");
        }
        return rawLongitude;
    }

    /**
     * Resuelve categories for registration normalizando entradas, defaults y casos borde.
     */
    private Set<Category> resolveCategoriesForRegistration(RegisterProfesionalRequest request) {
        return resolveCategories(request.getCategorySlugs(), request.getRubro());
    }

    private Set<Category> resolveCategories(List<String> categorySlugs, String rubro) {
        List<String> incoming = categorySlugs;
        if (incoming != null && !incoming.isEmpty()) {
            Set<String> normalizedSlugs = incoming.stream()
                .map(this::normalizeSlug)
                .filter(slug -> !slug.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
            if (normalizedSlugs.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccioná al menos un rubro");
            }
            return loadCategoriesBySlugs(normalizedSlugs);
        }

        String legacyRubro = rubro == null ? "" : rubro.trim();
        if (legacyRubro.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccioná al menos un rubro");
        }
        String slug = mapLegacyCategorySlug(SlugUtils.toSlug(legacyRubro));
        return loadCategoriesBySlugs(Set.of(slug));
    }

    /**
     * Carga la seccion categories by slugs desde base de datos o datos agregados y la deja lista para la respuesta.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    private Set<Category> loadCategoriesBySlugs(Set<String> slugs) {
        List<Category> categories = categoryRepository.findBySlugIn(slugs);
        Set<String> foundSlugs = categories.stream()
            .map(Category::getSlug)
            .collect(Collectors.toSet());
        Set<String> missing = slugs.stream()
            .filter(slug -> !foundSlugs.contains(slug))
            .collect(Collectors.toCollection(LinkedHashSet::new));
        if (!missing.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Rubros inválidos: " + String.join(", ", missing)
            );
        }
        return new LinkedHashSet<>(categories);
    }

    /**
     * Resuelve primary categoria name normalizando entradas, defaults y casos borde.
     */
    private String resolvePrimaryCategoryName(Set<Category> categories, String legacyRubro) {
        return categories.stream()
            .sorted(categoryComparator())
            .map(Category::getName)
            .findFirst()
            .orElseGet(() -> legacyRubro == null ? "" : legacyRubro.trim());
    }

    /**
     * Normaliza slug para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeSlug(String rawSlug) {
        if (rawSlug == null) return "";
        String normalized = rawSlug.trim().toLowerCase(Locale.ROOT);
        return mapLegacyCategorySlug(normalized);
    }

    /**
     * Mapea legacy categoria slug desde el modelo interno al contrato que usa otra capa.
     */
    private String mapLegacyCategorySlug(String slug) {
        return LEGACY_CATEGORY_ALIASES.getOrDefault(slug, slug);
    }

    /**
     * Mapea categories desde el modelo interno al contrato que usa otra capa.
     */
    private List<CategoryResponse> mapCategories(Set<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            return List.of();
        }
        return categories.stream()
            .sorted(categoryComparator())
            .map(category -> new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.getImageUrl(),
                category.getDisplayOrder()
            ))
            .toList();
    }

    /**
     * Ejecuta la logica de categoria comparator manteniendola encapsulada en este componente.
     */
    private Comparator<Category> categoryComparator() {
        return Comparator.comparingInt(
            (Category category) -> category.getDisplayOrder() == null ? Integer.MAX_VALUE : category.getDisplayOrder()
        ).thenComparing(Category::getName);
    }

    /**
     * Ejecuta la logica de login unified manteniendola encapsulada en este componente.
     */
    @Transactional
    public UnifiedLoginResult loginUnified(UnifiedLoginRequest request, SessionContext sessionContext) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmailAndDeletedAtIsNull(email).orElse(null);
        if (user == null) {
            burnPasswordWorkFactor(request.getPassword());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        List<AuthContextDescriptor> contexts = authContextResolver.resolve(user);
        if (contexts.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No hay contextos disponibles para esta cuenta");
        }

        AuthContextDescriptor active = null;
        if (request.getDesiredContext() != null) {
            active = authContextResolver.select(
                contexts,
                request.getDesiredContext(),
                request.getDesiredWorkerId(),
                request.getDesiredProfessionalId()
            );
            if (active == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Contexto deseado no disponible");
            }
        }
        if (active == null) {
            active = authContextResolver.pickDefault(contexts);
        }

        AuthResult tokens = issueTokens(user, toUserResponse(user), sessionContext, active);
        boolean selectionRequired = contexts.size() > 1 && request.getDesiredContext() == null;
        return new UnifiedLoginResult(tokens, contexts, active, selectionRequired);
    }

    /**
     * Ejecuta la logica de select contexto manteniendola encapsulada en este componente.
     */
    @Transactional
    public SelectContextResponse selectContext(
        String rawUserId,
        String currentSessionId,
        SelectContextRequest request
    ) {
        if (request == null || request.getType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Contexto requerido");
        }
        User user = loadUserByRawId(rawUserId);
        List<AuthContextDescriptor> contexts = authContextResolver.resolve(user);
        AuthContextDescriptor selected = authContextResolver.select(
            contexts,
            request.getType(),
            request.getWorkerId(),
            request.getProfessionalId()
        );
        if (selected == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Contexto no disponible");
        }
        Integer sessionVersion = user.getSessionVersion();
        if (sessionVersion == null || sessionVersion < 1) {
            user.setSessionVersion(1);
            userRepository.save(user);
            sessionVersion = 1;
        }
        sessionService.findSessionById(currentSessionId)
            .filter(session -> session.getUser() != null && session.getUser().getId().equals(user.getId()))
            .ifPresent(session -> sessionService.updateActiveContext(session, selected));
        String accessToken = createAccessToken(
            String.valueOf(user.getId()),
            user.getEmail(),
            user.getRole(),
            currentSessionId,
            sessionVersion,
            selected
        );
        return new SelectContextResponse(accessToken, selected);
    }

    @Transactional(readOnly = true)
    public AuthMeResponse getMe(String rawUserId, AuthContextType activeContextType, String activeProfessionalId, String activeWorkerId) {
        User user = loadUserByRawId(rawUserId);
        List<AuthContextDescriptor> contexts = authContextResolver.resolve(user);
        AuthContextDescriptor active = null;
        if (activeContextType != null) {
            active = authContextResolver.select(contexts, activeContextType, activeWorkerId, activeProfessionalId);
        }
        if (active == null && !contexts.isEmpty()) {
            active = authContextResolver.pickDefault(contexts);
        }
        return new AuthMeResponse(toUserResponse(user), active, contexts);
    }

    /**
     * Resuelve contexto default desde capacidades reales, dejando UserRole solo como compatibilidad.
     */
    private AuthContextDescriptor resolveDefaultContext(User user) {
        List<AuthContextDescriptor> contexts = authContextResolver.resolve(user);
        if (contexts == null || contexts.isEmpty()) {
            return null;
        }
        return authContextResolver.pickDefault(contexts);
    }

    private AuthContextDescriptor resolveRequiredContext(
        User user,
        AuthContextType type,
        String workerId,
        String professionalId
    ) {
        List<AuthContextDescriptor> contexts = authContextResolver.resolve(user);
        AuthContextDescriptor selected = authContextResolver.select(contexts, type, workerId, professionalId);
        if (selected == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Contexto deseado no disponible");
        }
        return selected;
    }

    private AuthContextDescriptor resolveOAuthInitialContext(User user, UserRole desiredRole) {
        if (desiredRole == UserRole.USER) {
            return resolveRequiredContext(user, AuthContextType.CLIENT, null, null);
        }
        if (desiredRole == UserRole.PROFESSIONAL) {
            return resolveRequiredContext(user, AuthContextType.PROFESSIONAL, null, null);
        }
        return resolveDefaultContext(user);
    }

    /**
     * Preserva el contexto del access token vigente durante refresh cuando sigue disponible.
     */
    private AuthContextDescriptor resolveRefreshContext(
        User user,
        AuthenticatedTokenDetails activeTokenDetails,
        AuthSession session
    ) {
        List<AuthContextDescriptor> contexts = authContextResolver.resolve(user);
        if (contexts == null || contexts.isEmpty()) {
            return null;
        }
        if (activeTokenDetails != null && activeTokenDetails.contextType() != null) {
            AuthContextDescriptor selected = authContextResolver.select(
                contexts,
                activeTokenDetails.contextType(),
                activeTokenDetails.workerId(),
                activeTokenDetails.professionalId()
            );
            if (selected != null) {
                return selected;
            }
        }
        if (session != null && session.getActiveContextType() != null) {
            AuthContextDescriptor selected = authContextResolver.select(
                contexts,
                session.getActiveContextType(),
                session.getActiveWorkerId(),
                session.getActiveProfessionalId()
            );
            if (selected != null) {
                return selected;
            }
        }
        return authContextResolver.pickDefault(contexts);
    }

    /**
     * Bloque de datos unified login result dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record UnifiedLoginResult(
        AuthResult auth,
        List<AuthContextDescriptor> contexts,
        AuthContextDescriptor activeContext,
        boolean contextSelectionRequired
    ) {}
}

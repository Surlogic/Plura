package com.plura.plurabackend.core.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.plura.plurabackend.core.auth.dto.LoginRequest;
import com.plura.plurabackend.core.auth.dto.ProfesionalProfileResponse;
import com.plura.plurabackend.core.auth.dto.RegisterProfesionalRequest;
import com.plura.plurabackend.core.auth.dto.RegisterRequest;
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
    private final PasswordEncoder passwordEncoder;
    private final Algorithm jwtAlgorithm;
    private final long jwtExpirationMinutes;
    private final long refreshTokenDays;
    private final String refreshTokenPepper;
    private final String jwtIssuer;
    private final String dummyPasswordHash;
    private final boolean allowLegacyRefreshFallback;
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

    public AuthService(
        UserRepository userRepository,
        CategoryRepository categoryRepository,
        RefreshTokenRepository refreshTokenRepository,
        OAuthService oAuthService,
        SessionService sessionService,
        AuthAuditService authAuditService,
        ProfessionalAccountProfileGateway professionalAccountProfileGateway,
        EffectiveProfessionalPlanService effectiveProfessionalPlanService,
        PasswordEncoder passwordEncoder,
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
        this.passwordEncoder = passwordEncoder;
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

    private record RefreshTokenIssue(String rawToken, RefreshToken entity) {}
    private record SessionTokenIssue(String rawToken, AuthSession session) {}
    public record SessionContext(
        AuthSessionType sessionType,
        String userAgent,
        String ipAddress
    ) {}

    @Transactional
    public void registerCliente(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmailAndDeletedAtIsNull(normalizedEmail).isPresent()) {
            burnPasswordWorkFactor(request.getPassword());
            return;
        }

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(normalizedEmail);
        user.setPhoneNumber(request.getPhoneNumber().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.USER);

        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException exception) {
            burnPasswordWorkFactor(request.getPassword());
        }
    }

    @Transactional
    public void registerProfesional(RegisterProfesionalRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        User existingUser = userRepository.findByEmailAndDeletedAtIsNull(normalizedEmail).orElse(null);
        if (existingUser != null) {
            burnPasswordWorkFactor(request.getPassword());
            if (isProfessionalUser(existingUser)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, CLIENT_ACCOUNT_EXISTS_FOR_PROFESSIONAL_MESSAGE);
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

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(normalizedEmail);
        user.setPhoneNumber(request.getPhoneNumber().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.PROFESSIONAL);
        User savedUser;
        try {
            savedUser = userRepository.save(user);
        } catch (DataIntegrityViolationException exception) {
            burnPasswordWorkFactor(request.getPassword());
            User duplicatedUser = userRepository.findByEmailAndDeletedAtIsNull(normalizedEmail).orElse(null);
            if (duplicatedUser != null && isProfessionalUser(duplicatedUser)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, CLIENT_ACCOUNT_EXISTS_FOR_PROFESSIONAL_MESSAGE);
        }

        Set<Category> categories = resolveCategoriesForRegistration(request);
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
    public AuthResult loginProfesional(LoginRequest request, SessionContext sessionContext) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(request.getEmail().trim().toLowerCase(Locale.ROOT))
            .orElse(null);
        if (user == null) {
            burnPasswordWorkFactor(request.getPassword());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        if (!isProfessionalUser(user)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, CLIENT_ACCOUNT_LOGIN_MISMATCH_MESSAGE);
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        return issueTokens(user, toUserResponse(user), sessionContext);
    }

    @Transactional
    public AuthResult loginCliente(LoginRequest request, SessionContext sessionContext) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(request.getEmail().trim().toLowerCase(Locale.ROOT))
            .orElse(null);
        if (user == null) {
            burnPasswordWorkFactor(request.getPassword());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        if (!isClientUser(user)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, PROFESSIONAL_ACCOUNT_LOGIN_MISMATCH_MESSAGE);
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        return issueTokens(user, toUserResponse(user), sessionContext);
    }

    @Transactional
    public AuthResult loginWithOAuth(OAuthLoginRequest request, SessionContext sessionContext) {
        OAuthUserInfo userInfo = oAuthService.verify(request);
        String normalizedProvider = normalizeOAuthProvider(userInfo.provider());
        String providerId = normalizeOAuthValue(userInfo.providerId());
        String email = normalizeOAuthEmail(userInfo.email());
        UserRole desiredRole = normalizeDesiredOAuthRole(request.getDesiredRole());
        OAuthAuthAction authAction = normalizeOAuthAuthAction(request.getAuthAction());

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
            user = new User();
            user.setRole(desiredRole == null ? UserRole.USER : desiredRole);
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setFullName(resolveOAuthDisplayName(userInfo.name(), user.getEmail()));
            user.setProvider(normalizedProvider);
            user.setProviderId(providerId);
            user.setAvatar(normalizeOAuthValue(userInfo.avatar()));
            applyTrustedEmailVerification(user, normalizedProvider);
            user = userRepository.save(user);
            if (isProfessionalUser(user)) {
                ensureProfessionalProfile(user);
            }
        } else {
            boolean promoteExistingClientToProfessional =
                authAction == OAuthAuthAction.REGISTER
                    && desiredRole == UserRole.PROFESSIONAL
                    && isClientUser(user)
                    && !isProfessionalUser(user);

            boolean changed = false;
            if (promoteExistingClientToProfessional) {
                user.setRole(UserRole.PROFESSIONAL);
                changed = true;
                ensureProfessionalProfile(user);
            } else if (authAction == OAuthAuthAction.REGISTER) {
                if (desiredRole == UserRole.USER && !isClientUser(user)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE);
                }
                if (isProfessionalUser(user)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE);
                }
                throw new ResponseStatusException(HttpStatus.CONFLICT, CLIENT_ACCOUNT_EXISTS_MESSAGE);
            }

            if (desiredRole == UserRole.PROFESSIONAL && !isProfessionalUser(user)) {
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
            if (isProfessionalUser(user)) {
                ensureProfessionalProfile(user);
            }
        }

        return issueTokens(user, toUserResponse(user), sessionContext);
    }

    @Transactional(noRollbackFor = AuthApiException.class)
    public AuthResult refreshSession(String refreshToken, SessionContext sessionContext) {
        if (refreshToken == null || refreshToken.isBlank()) {
            auditRefreshFailure(null, null, sessionContext, "missing_refresh_token");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_INVALID", "Refresh token faltante.");
        }

        String tokenHash = hashToken(refreshToken);
        LocalDateTime now = LocalDateTime.now();

        SessionService.TrackedRefreshTokenMatch trackedMatch = sessionService.findTrackedRefreshTokenMatch(tokenHash)
            .orElse(null);
        if (trackedMatch != null) {
            return refreshTrackedSession(trackedMatch, sessionContext, now);
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
            return migrateLegacyRefreshToken(stored, sessionContext, now);
        }

        auditRefreshFailure(null, null, sessionContext, "refresh_token_invalid");
        throw new AuthApiException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_INVALID", "Refresh token inválido.");
    }

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

    @Transactional
    public void logoutAllSessions(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        sessionService.incrementSessionVersion(userId);
        sessionService.revokeAllSessionsForUser(userId, sessionService.revokeReasonLogoutAll());
    }

    @Transactional(readOnly = true)
    public List<AuthSessionResponse> listSessions(String rawUserId, String currentSessionId) {
        return sessionService.listSessions(parseUserId(rawUserId), currentSessionId);
    }

    @Transactional
    public void revokeSession(String rawUserId, String sessionId) {
        sessionService.revokeSessionByIdForUser(
            parseUserId(rawUserId),
            sessionId,
            sessionService.revokeReasonSessionRevoked()
        );
    }

    private AuthResult issueTokens(User user, UserResponse userResponse, SessionContext sessionContext) {
        String userId = String.valueOf(user.getId());
        user.setLastLoginAt(LocalDateTime.now());
        user.setLastLoginIp(normalizeIpAddress(sessionContext == null ? null : sessionContext.ipAddress()));
        if (user.getSessionVersion() == null || user.getSessionVersion() < 1) {
            user.setSessionVersion(1);
        }
        User savedUser = userRepository.save(user);
        SessionTokenIssue sessionToken = createSessionToken(savedUser, sessionContext);
        String accessToken = createAccessToken(
            userId,
            savedUser.getEmail(),
            savedUser.getRole(),
            sessionToken.session().getId(),
            savedUser.getSessionVersion()
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

    private String createAccessToken(String userId, String email, UserRole role, String sessionId, Integer sessionVersion) {
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
        return builder.sign(jwtAlgorithm);
    }

    private AuthResult refreshTrackedSession(
        SessionService.TrackedRefreshTokenMatch trackedMatch,
        SessionContext sessionContext,
        LocalDateTime now
    ) {
        AuthSession session = trackedMatch.session();
        if (session.getRevokedAt() != null) {
            auditRefreshFailure(sessionUserId(session), session.getId(), sessionContext, "session_revoked");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "SESSION_REVOKED", "La sesión ya no es válida.");
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
        String accessToken = createAccessToken(
            String.valueOf(user.getId()),
            user.getEmail(),
            user.getRole(),
            rotated.getId(),
            user.getSessionVersion()
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

    private AuthResult migrateLegacyRefreshToken(RefreshToken stored, SessionContext sessionContext, LocalDateTime now) {
        if (stored.getRevokedAt() != null) {
            Long userId = stored.getUser() == null ? null : stored.getUser().getId();
            auditRefreshFailure(userId, null, sessionContext, "legacy_refresh_revoked");
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "SESSION_REVOKED", "La sesión ya no es válida.");
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
        String accessToken = createAccessToken(
            String.valueOf(user.getId()),
            user.getEmail(),
            user.getRole(),
            migration.session().getId(),
            user.getSessionVersion()
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

    private RefreshTokenIssue createRefreshToken(User user) {
        String rawToken = generateRefreshToken();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(hashToken(rawToken));
        refreshToken.setExpiryDate(LocalDateTime.now().plusDays(refreshTokenDays));
        RefreshToken saved = refreshTokenRepository.save(refreshToken);
        return new RefreshTokenIssue(rawToken, saved);
    }

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

    private String generateRefreshToken() {
        byte[] randomBytes = new byte[64];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

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

    private void burnPasswordWorkFactor(String rawPassword) {
        String candidate = rawPassword == null ? "" : rawPassword;
        passwordEncoder.matches(candidate, dummyPasswordHash);
    }

    private User loadUserByRawId(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        return userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
    }

    private Long parseUserId(String rawUserId) {
        try {
            return Long.valueOf(rawUserId);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido");
        }
    }


    private AuthSessionType resolveSessionType(SessionContext sessionContext) {
        if (sessionContext == null || sessionContext.sessionType() == null) {
            return AuthSessionType.WEB;
        }
        return sessionContext.sessionType();
    }

    private AuthSessionResponse toAuthSessionResponse(AuthSession session, boolean current) {
        return new AuthSessionResponse(
            session.getId(),
            session.getSessionType().name(),
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

    private Long sessionUserId(AuthSession session) {
        if (session == null || session.getUser() == null) {
            return null;
        }
        return session.getUser().getId();
    }

    public ProfesionalProfileResponse getProfesionalProfile(String rawUserId) {
        User user = loadUserByRawId(rawUserId);
        ensureProfessionalUser(user);

        ProfessionalProfile profile = professionalAccountProfileGateway.loadOrBootstrapProfile(user);

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

    private MediaPresentationDto toMediaPresentation(Double positionX, Double positionY, Double zoom) {
        return new MediaPresentationDto(
            positionX != null ? positionX : 50d,
            positionY != null ? positionY : 50d,
            zoom != null ? zoom : 1d
        );
    }

    @Transactional
    public void completeOAuthPhone(String rawUserId, CompleteOAuthPhoneRequest request) {
        User user = loadUserByRawId(rawUserId);
        if (request == null || request.getPhoneNumber() == null || request.getPhoneNumber().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teléfono inválido");
        }

        String normalizedPhone = normalizePhoneNumber(request.getPhoneNumber());
        if (normalizedPhone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teléfono inválido");
        }

        String currentPhone = normalizePhoneNumber(user.getPhoneNumber());
        if (normalizedPhone.equals(currentPhone)) {
            return;
        }

        user.setPhoneNumber(normalizedPhone);
        user.setPhoneVerifiedAt(null);
        userRepository.save(user);
    }

    public UserResponse getClienteProfile(String rawUserId) {
        User user = loadUserByRawId(rawUserId);
        ensureClientUser(user);
        return toUserResponse(user);
    }

    private void ensureProfessionalUser(User user) {
        if (!isProfessionalUser(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo profesionales");
        }
    }

    private void ensureClientUser(User user) {
        if (!isClientUser(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
    }

    private boolean isProfessionalUser(User user) {
        return user != null && user.getRole() == UserRole.PROFESSIONAL;
    }

    private boolean isClientUser(User user) {
        return user != null && user.getRole() == UserRole.USER;
    }

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

    private String normalizeOAuthEmail(String email) {
        String normalized = normalizeOAuthValue(email);
        if (normalized == null) {
            return null;
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

    private String normalizeOAuthProvider(String provider) {
        String normalized = normalizeOAuthValue(provider);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provider OAuth inválido");
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

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

    private String normalizeOAuthValue(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

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

    private ProfessionalProfile ensureProfessionalProfile(User user) {
        return professionalAccountProfileGateway.loadOrBootstrapProfile(user);
    }

    private enum OAuthAuthAction {
        LOGIN,
        REGISTER
    }

    private String normalizeTipoCliente(String rawTipoCliente) {
        if (rawTipoCliente == null) return "";
        return rawTipoCliente.trim().toUpperCase();
    }

    private boolean requiresProfessionalLocation(String tipoCliente) {
        return "LOCAL".equals(tipoCliente);
    }

    private String normalizeLocation(String rawLocation) {
        if (rawLocation == null) return null;
        String trimmed = rawLocation.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String normalizeLocationPart(String rawValue, boolean required, String fieldName) {
        String normalized = normalizeLocation(rawValue);
        if (normalized == null && required) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " es obligatorio");
        }
        return normalized;
    }


    private String composeLocation(String fullAddress, String city, String country) {
        return String.join(", ", fullAddress.trim(), city.trim(), country.trim());
    }

    private void validateCoordinatesPair(Double latitude, Double longitude) {
        if ((latitude == null) == (longitude == null)) {
            return;
        }
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "latitude y longitude deben enviarse juntas"
        );
    }

    private Double normalizeLatitude(Double rawLatitude) {
        if (rawLatitude == null) {
            return null;
        }
        if (rawLatitude < -90d || rawLatitude > 90d) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "latitude fuera de rango");
        }
        return rawLatitude;
    }

    private Double normalizeLongitude(Double rawLongitude) {
        if (rawLongitude == null) {
            return null;
        }
        if (rawLongitude < -180d || rawLongitude > 180d) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "longitude fuera de rango");
        }
        return rawLongitude;
    }

    private Set<Category> resolveCategoriesForRegistration(RegisterProfesionalRequest request) {
        List<String> incoming = request.getCategorySlugs();
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

        String legacyRubro = request.getRubro() == null ? "" : request.getRubro().trim();
        if (legacyRubro.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccioná al menos un rubro");
        }
        String slug = mapLegacyCategorySlug(SlugUtils.toSlug(legacyRubro));
        return loadCategoriesBySlugs(Set.of(slug));
    }

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

    private String resolvePrimaryCategoryName(Set<Category> categories, String legacyRubro) {
        return categories.stream()
            .sorted(categoryComparator())
            .map(Category::getName)
            .findFirst()
            .orElseGet(() -> legacyRubro == null ? "" : legacyRubro.trim());
    }

    private String normalizeSlug(String rawSlug) {
        if (rawSlug == null) return "";
        String normalized = rawSlug.trim().toLowerCase(Locale.ROOT);
        return mapLegacyCategorySlug(normalized);
    }

    private String mapLegacyCategorySlug(String slug) {
        return LEGACY_CATEGORY_ALIASES.getOrDefault(slug, slug);
    }

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

    private Comparator<Category> categoryComparator() {
        return Comparator.comparingInt(
            (Category category) -> category.getDisplayOrder() == null ? Integer.MAX_VALUE : category.getDisplayOrder()
        ).thenComparing(Category::getName);
    }
}

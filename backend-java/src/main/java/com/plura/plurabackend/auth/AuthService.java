package com.plura.plurabackend.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.plura.plurabackend.auth.dto.LoginRequest;
import com.plura.plurabackend.auth.dto.ProfesionalProfileResponse;
import com.plura.plurabackend.auth.dto.RegisterProfesionalRequest;
import com.plura.plurabackend.auth.dto.RegisterRequest;
import com.plura.plurabackend.auth.dto.UserResponse;
import com.plura.plurabackend.auth.oauth.AppleEmailRequiredFirstLoginException;
import com.plura.plurabackend.auth.oauth.OAuthService;
import com.plura.plurabackend.auth.oauth.OAuthProviderMismatchException;
import com.plura.plurabackend.auth.oauth.OAuthUserInfo;
import com.plura.plurabackend.category.dto.CategoryResponse;
import com.plura.plurabackend.category.model.Category;
import com.plura.plurabackend.category.repository.CategoryRepository;
import com.plura.plurabackend.auth.model.RefreshToken;
import com.plura.plurabackend.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.common.util.SlugUtils;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.search.engine.SearchSyncPublisher;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
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
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final CategoryRepository categoryRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OAuthService oAuthService;
    private final SearchSyncPublisher searchSyncPublisher;
    private final PasswordEncoder passwordEncoder;
    private final Algorithm jwtAlgorithm;
    private final long jwtExpirationMinutes;
    private final long refreshTokenDays;
    private final String refreshTokenPepper;
    private final String jwtIssuer;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Map<String, String> LEGACY_CATEGORY_ALIASES = Map.ofEntries(
        Map.entry("peluqueria", "cabello"),
        Map.entry("cejas", "pestanas-cejas"),
        Map.entry("pestanas", "pestanas-cejas"),
        Map.entry("faciales", "estetica-facial"),
        Map.entry("tratamientos-corporales", "tratamientos-corporales"),
        Map.entry("medicina-estetica", "medicina-estetica"),
        Map.entry("bienestar-holistico", "bienestar-holistico")
    );

    public AuthService(
        UserRepository userRepository,
        ProfessionalProfileRepository professionalProfileRepository,
        CategoryRepository categoryRepository,
        RefreshTokenRepository refreshTokenRepository,
        OAuthService oAuthService,
        SearchSyncPublisher searchSyncPublisher,
        PasswordEncoder passwordEncoder,
        @Value("${jwt.secret}") String jwtSecret,
        @Value("${jwt.expiration-minutes:30}") long jwtExpirationMinutes,
        @Value("${jwt.refresh-days:30}") long refreshTokenDays,
        @Value("${jwt.refresh-pepper}") String refreshTokenPepper,
        @Value("${jwt.issuer:plura}") String jwtIssuer
    ) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET no está configurado");
        }
        if (refreshTokenPepper == null || refreshTokenPepper.isBlank()) {
            throw new IllegalStateException("JWT_REFRESH_PEPPER no está configurado");
        }
        this.userRepository = userRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.categoryRepository = categoryRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.oAuthService = oAuthService;
        this.searchSyncPublisher = searchSyncPublisher;
        this.passwordEncoder = passwordEncoder;
        this.jwtAlgorithm = Algorithm.HMAC256(jwtSecret);
        this.jwtExpirationMinutes = jwtExpirationMinutes;
        this.refreshTokenDays = refreshTokenDays;
        this.refreshTokenPepper = refreshTokenPepper;
        this.jwtIssuer = jwtIssuer;
    }

    public record AuthResult(
        String accessToken,
        String refreshToken,
        UserResponse user,
        UserRole role
    ) {}

    private record RefreshTokenIssue(String rawToken, RefreshToken entity) {}

    @Transactional
    public AuthResult registerCliente(RegisterRequest request, String userAgent) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No se pudo crear la cuenta");
        }

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPhoneNumber(request.getPhoneNumber().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.USER);

        User saved = userRepository.save(user);
        UserResponse userResponse = toUserResponse(saved);
        return issueTokens(saved, userResponse, userAgent);
    }

    @Transactional
    public AuthResult registerProfesional(RegisterProfesionalRequest request, String userAgent) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No se pudo crear la cuenta");
        }

        String tipoCliente = normalizeTipoCliente(request.getTipoCliente());
        String location = normalizeLocation(request.getLocation());
        Double latitude = normalizeLatitude(request.getLatitude());
        Double longitude = normalizeLongitude(request.getLongitude());
        validateCoordinatesPair(latitude, longitude);

        if (!"SIN_LOCAL".equals(tipoCliente) && (location == null || location.isBlank())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "La ubicación es obligatoria para locales o profesionales con local propio"
            );
        }
        if (!"SIN_LOCAL".equals(tipoCliente) && (latitude == null || longitude == null)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "No se pudo geocodificar la ubicación"
            );
        }
        if ("SIN_LOCAL".equals(tipoCliente)) {
            latitude = null;
            longitude = null;
        }

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPhoneNumber(request.getPhoneNumber().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.PROFESSIONAL);
        User savedUser = userRepository.save(user);

        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setUser(savedUser);
        Set<Category> categories = resolveCategoriesForRegistration(request);
        profile.setCategories(categories);
        profile.setRubro(resolvePrimaryCategoryName(categories, request.getRubro()));
        profile.setDisplayName(savedUser.getFullName());
        profile.setSlug(
            SlugUtils.generateUniqueSlug(
                savedUser.getFullName(),
                professionalProfileRepository::existsBySlug
            )
        );
        profile.setLocation("SIN_LOCAL".equals(tipoCliente) ? null : location);
        profile.setLocationText("SIN_LOCAL".equals(tipoCliente) ? null : location);
        profile.setLatitude(latitude);
        profile.setLongitude(longitude);
        profile.setTipoCliente(tipoCliente);
        profile = professionalProfileRepository.save(profile);
        professionalProfileRepository.updateCoordinates(profile.getId(), latitude, longitude);
        searchSyncPublisher.publishProfileChanged(profile.getId());

        UserResponse userResponse = toUserResponse(savedUser);
        return issueTokens(savedUser, userResponse, userAgent);
    }

    public AuthResult loginProfesional(LoginRequest request, String userAgent) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas"));

        if (user.getRole() != UserRole.PROFESSIONAL) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        return issueTokens(user, toUserResponse(user), userAgent);
    }

    public AuthResult loginCliente(LoginRequest request, String userAgent) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas"));

        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        return issueTokens(user, toUserResponse(user), userAgent);
    }

    @Transactional
    public AuthResult loginWithOAuth(String provider, String token, String userAgent) {
        OAuthUserInfo userInfo = oAuthService.verify(provider, token);
        String normalizedProvider = normalizeOAuthProvider(userInfo.provider());
        String providerId = normalizeOAuthValue(userInfo.providerId());
        String email = normalizeOAuthEmail(userInfo.email());

        if (providerId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token OAuth sin providerId");
        }

        User user = null;
        if (email != null) {
            user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                String existingProvider = normalizeOAuthValue(user.getProvider());
                if (existingProvider != null && !normalizedProvider.equals(existingProvider.toLowerCase(Locale.ROOT))) {
                    throw new OAuthProviderMismatchException();
                }
            }
        }
        if (user == null) {
            user = userRepository.findByProviderAndProviderId(normalizedProvider, providerId).orElse(null);
        }

        if (user == null) {
            if ("apple".equals(normalizedProvider) && email == null) {
                throw new AppleEmailRequiredFirstLoginException();
            }
            if (email == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OAuth email es obligatorio");
            }
            user = new User();
            user.setRole(UserRole.USER);
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setFullName(resolveOAuthDisplayName(userInfo.name(), user.getEmail()));
            user.setProvider(normalizedProvider);
            user.setProviderId(providerId);
            user.setAvatar(normalizeOAuthValue(userInfo.avatar()));
            user = userRepository.save(user);
        } else {
            boolean changed = false;
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
            if (changed) {
                user = userRepository.save(user);
            }
        }

        return issueTokens(user, toUserResponse(user), userAgent);
    }

    @Transactional
    public AuthResult refreshSession(String refreshToken, String userAgent) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token faltante");
        }

        String tokenHash = hashToken(refreshToken);
        RefreshToken stored = refreshTokenRepository.findByToken(tokenHash)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token inválido"));

        if (stored.getRevokedAt() != null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token revocado");
        }

        LocalDateTime now = LocalDateTime.now();
        if (stored.getExpiryDate().isBefore(now)) {
            stored.setRevokedAt(now);
            refreshTokenRepository.save(stored);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expirado");
        }

        User user = stored.getUser();

        stored.setRevokedAt(now);
        refreshTokenRepository.save(stored);
        RefreshTokenIssue replacement = createRefreshToken(user);

        String accessToken = createAccessToken(
            String.valueOf(user.getId()),
            user.getEmail(),
            user.getRole()
        );

        return new AuthResult(accessToken, replacement.rawToken(), toUserResponse(user), user.getRole());
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        String tokenHash = hashToken(refreshToken);
        refreshTokenRepository.findByToken(tokenHash).ifPresent(stored -> {
            if (stored.getRevokedAt() == null) {
                stored.setRevokedAt(LocalDateTime.now());
                refreshTokenRepository.save(stored);
            }
        });
    }

    private AuthResult issueTokens(User user, UserResponse userResponse, String userAgent) {
        String userId = String.valueOf(user.getId());
        String accessToken = createAccessToken(userId, user.getEmail(), user.getRole());
        RefreshTokenIssue refreshToken = createRefreshToken(user);
        return new AuthResult(accessToken, refreshToken.rawToken(), userResponse, user.getRole());
    }

    private String createAccessToken(String userId, String email, UserRole role) {
        Date now = new Date();
        Date expiresAt = Date.from(Instant.now().plus(jwtExpirationMinutes, ChronoUnit.MINUTES));
        return JWT.create()
            .withSubject(userId)
            .withClaim("email", email)
            .withClaim("role", role.name())
            .withIssuer(jwtIssuer)
            .withIssuedAt(now)
            .withExpiresAt(expiresAt)
            .sign(jwtAlgorithm);
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

    private User loadUserByRawId(String rawUserId) {
        Long userId;
        try {
            userId = Long.valueOf(rawUserId);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token inválido");
        }

        return userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
    }

    public ProfesionalProfileResponse getProfesionalProfile(String rawUserId) {
        User user = loadUserByRawId(rawUserId);
        if (user.getRole() != UserRole.PROFESSIONAL) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo profesionales");
        }

        ProfessionalProfile profile = professionalProfileRepository.findByUser_Id(user.getId())
            .orElseGet(() -> bootstrapMissingProfessionalProfile(user));

        if (profile.getSlug() == null || profile.getSlug().isBlank()) {
            profile.setSlug(
                SlugUtils.generateUniqueSlug(user.getFullName(), professionalProfileRepository::existsBySlug)
            );
            profile = professionalProfileRepository.save(profile);
            searchSyncPublisher.publishProfileChanged(profile.getId());
        }

        return new ProfesionalProfileResponse(
            String.valueOf(user.getId()),
            profile.getSlug(),
            user.getFullName(),
            user.getEmail(),
            user.getPhoneNumber(),
            profile.getRubro(),
            profile.getLocation(),
            profile.getLatitude(),
            profile.getLongitude(),
            profile.getTipoCliente(),
            profile.getLogoUrl(),
            profile.getInstagram(),
            profile.getFacebook(),
            profile.getTiktok(),
            profile.getWebsite(),
            profile.getWhatsapp(),
            profile.getPublicHeadline(),
            profile.getPublicAbout(),
            profile.getPublicPhotos(),
            mapCategories(profile.getCategories()),
            user.getCreatedAt()
        );
    }

    private ProfessionalProfile bootstrapMissingProfessionalProfile(User user) {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setUser(user);
        profile.setRubro("Profesional");
        profile.setDisplayName(user.getFullName());
        profile.setSlug(
            SlugUtils.generateUniqueSlug(
                user.getFullName(),
                professionalProfileRepository::existsBySlug
            )
        );
        profile.setTipoCliente("SIN_LOCAL");
        profile.setLocation(null);
        profile.setLocationText(null);
        profile.setLatitude(null);
        profile.setLongitude(null);
        profile.setActive(true);

        try {
            ProfessionalProfile created = professionalProfileRepository.save(profile);
            searchSyncPublisher.publishProfileChanged(created.getId());
            return created;
        } catch (DataIntegrityViolationException exception) {
            return professionalProfileRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No se pudo inicializar el perfil profesional"
                ));
        }
    }

    public UserResponse getClienteProfile(String rawUserId) {
        User user = loadUserByRawId(rawUserId);
        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
        return toUserResponse(user);
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
            String.valueOf(user.getId()),
            user.getEmail(),
            user.getFullName(),
            user.getCreatedAt()
        );
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

    private String normalizeTipoCliente(String rawTipoCliente) {
        if (rawTipoCliente == null) return "";
        return rawTipoCliente.trim().toUpperCase();
    }

    private String normalizeLocation(String rawLocation) {
        if (rawLocation == null) return null;
        String trimmed = rawLocation.trim();
        return trimmed.isBlank() ? null : trimmed;
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

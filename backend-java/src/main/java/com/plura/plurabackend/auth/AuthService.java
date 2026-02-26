package com.plura.plurabackend.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.plura.plurabackend.auth.dto.LoginRequest;
import com.plura.plurabackend.auth.dto.ProfesionalProfileResponse;
import com.plura.plurabackend.auth.dto.RegisterProfesionalRequest;
import com.plura.plurabackend.auth.dto.RegisterRequest;
import com.plura.plurabackend.auth.dto.UserResponse;
import com.plura.plurabackend.auth.model.RefreshToken;
import com.plura.plurabackend.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.common.util.SlugUtils;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
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
import java.util.Date;
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
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final Algorithm jwtAlgorithm;
    private final long jwtExpirationMinutes;
    private final long refreshTokenDays;
    private final String refreshTokenPepper;
    private final String jwtIssuer;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public AuthService(
        UserRepository userRepository,
        ProfessionalProfileRepository professionalProfileRepository,
        RefreshTokenRepository refreshTokenRepository,
        PasswordEncoder passwordEncoder,
        @Value("${jwt.secret}") String jwtSecret,
        @Value("${jwt.expiration-minutes:30}") long jwtExpirationMinutes,
        @Value("${jwt.refresh-days:30}") long refreshTokenDays,
        @Value("${jwt.refresh-pepper:}") String refreshTokenPepper,
        @Value("${jwt.issuer:plura}") String jwtIssuer
    ) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET no está configurado");
        }
        this.userRepository = userRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtAlgorithm = Algorithm.HMAC256(jwtSecret);
        this.jwtExpirationMinutes = jwtExpirationMinutes;
        this.refreshTokenDays = refreshTokenDays;
        this.refreshTokenPepper = refreshTokenPepper == null ? "" : refreshTokenPepper;
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
        if (!"SIN_LOCAL".equals(tipoCliente) && (location == null || location.isBlank())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "La ubicación es obligatoria para locales o profesionales con local propio"
            );
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
        profile.setRubro(request.getRubro().trim());
        profile.setSlug(
            SlugUtils.generateUniqueSlug(
                savedUser.getFullName(),
                professionalProfileRepository::existsBySlug
            )
        );
        profile.setLocation("SIN_LOCAL".equals(tipoCliente) ? null : location);
        profile.setTipoCliente(tipoCliente);
        professionalProfileRepository.save(profile);

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
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil profesional no encontrado"));

        if (profile.getSlug() == null || profile.getSlug().isBlank()) {
            profile.setSlug(
                SlugUtils.generateUniqueSlug(user.getFullName(), professionalProfileRepository::existsBySlug)
            );
            profile = professionalProfileRepository.save(profile);
        }

        return new ProfesionalProfileResponse(
            String.valueOf(user.getId()),
            profile.getSlug(),
            user.getFullName(),
            user.getEmail(),
            user.getPhoneNumber(),
            profile.getRubro(),
            profile.getLocation(),
            profile.getTipoCliente(),
            profile.getPublicHeadline(),
            profile.getPublicAbout(),
            profile.getPublicPhotos(),
            user.getCreatedAt()
        );
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

    private String normalizeTipoCliente(String rawTipoCliente) {
        if (rawTipoCliente == null) return "";
        return rawTipoCliente.trim().toUpperCase();
    }

    private String normalizeLocation(String rawLocation) {
        if (rawLocation == null) return null;
        String trimmed = rawLocation.trim();
        return trimmed.isBlank() ? null : trimmed;
    }
}

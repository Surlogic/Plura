package com.plura.plurabackend.core.billing.providerconnection;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.providerconnection.mercadopago.MercadoPagoOAuthClient;
import com.plura.plurabackend.core.billing.providerconnection.mercadopago.MercadoPagoOAuthStateService;
import com.plura.plurabackend.core.billing.providerconnection.model.ProfessionalPaymentProviderConnection;
import com.plura.plurabackend.core.billing.providerconnection.model.ProfessionalPaymentProviderConnectionStatus;
import com.plura.plurabackend.core.billing.providerconnection.repository.ProfessionalPaymentProviderConnectionRepository;
import com.plura.plurabackend.core.billing.providerconnection.security.MercadoPagoOAuthTokenCipher;
import com.plura.plurabackend.core.professional.ProfessionalBillingSubjectGateway;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.plan.BooleanCapability;
import com.plura.plurabackend.professional.plan.PlanGuardService;
import com.plura.plurabackend.professional.paymentprovider.dto.MercadoPagoOAuthStartResponse;
import com.plura.plurabackend.professional.paymentprovider.dto.ProfessionalPaymentProviderConnectionResponse;
import java.time.ZoneOffset;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfessionalPaymentProviderConnectionService {

    private static final PaymentProvider MERCADO_PAGO_PROVIDER = PaymentProvider.MERCADOPAGO;
    private static final Logger LOGGER = LoggerFactory.getLogger(ProfessionalPaymentProviderConnectionService.class);

    private final ProfessionalBillingSubjectGateway professionalBillingSubjectGateway;
    private final ProfessionalPaymentProviderConnectionRepository repository;
    private final MercadoPagoOAuthStateService mercadoPagoOAuthStateService;
    private final MercadoPagoOAuthClient mercadoPagoOAuthClient;
    private final MercadoPagoOAuthTokenCipher mercadoPagoOAuthTokenCipher;
    private final ObjectMapper objectMapper;
    private final PlanGuardService planGuardService;

    public ProfessionalPaymentProviderConnectionService(
        ProfessionalBillingSubjectGateway professionalBillingSubjectGateway,
        ProfessionalPaymentProviderConnectionRepository repository,
        MercadoPagoOAuthStateService mercadoPagoOAuthStateService,
        MercadoPagoOAuthClient mercadoPagoOAuthClient,
        MercadoPagoOAuthTokenCipher mercadoPagoOAuthTokenCipher,
        ObjectMapper objectMapper,
        PlanGuardService planGuardService
    ) {
        this.professionalBillingSubjectGateway = professionalBillingSubjectGateway;
        this.repository = repository;
        this.mercadoPagoOAuthStateService = mercadoPagoOAuthStateService;
        this.mercadoPagoOAuthClient = mercadoPagoOAuthClient;
        this.mercadoPagoOAuthTokenCipher = mercadoPagoOAuthTokenCipher;
        this.objectMapper = objectMapper;
        this.planGuardService = planGuardService;
    }

    @Transactional(readOnly = true)
    public ProfessionalPaymentProviderConnectionResponse getMercadoPagoConnection(Long professionalUserId) {
        ProfessionalProfile professional = loadProfessional(professionalUserId);
        return toResponse(findConnection(professional.getId()).orElse(null));
    }

    @Transactional
    public MercadoPagoOAuthStartResponse startMercadoPagoOAuth(Long professionalUserId) {
        ProfessionalProfile professional = loadProfessional(professionalUserId);
        ensureOnlinePaymentsEnabledForUser(professionalUserId);
        LOGGER.info(
            "Starting Mercado Pago OAuth onboarding professionalUserId={} professionalId={} provider={} pkceEnabled={}",
            professionalUserId,
            professional.getId(),
            MERCADO_PAGO_PROVIDER,
            mercadoPagoOAuthStateService.isPkceEnabled()
        );
        MercadoPagoOAuthStateService.GeneratedState state =
            mercadoPagoOAuthStateService.generateState(professional.getId());
        String authorizationUrl = mercadoPagoOAuthClient.buildAuthorizationUrl(state.value(), state.pkceChallenge());
        Optional<ProfessionalPaymentProviderConnection> existing = findConnection(professional.getId());
        if (existing.isPresent()
            && existing.get().getStatus() != ProfessionalPaymentProviderConnectionStatus.CONNECTED) {
            ProfessionalPaymentProviderConnection connection = existing.get();
            connection.setStatus(ProfessionalPaymentProviderConnectionStatus.PENDING_AUTHORIZATION);
            connection.setLastError(null);
            storePendingAuthorizationAttempt(connection, state);
            repository.save(connection);
        } else if (existing.isEmpty()) {
            ProfessionalPaymentProviderConnection connection = new ProfessionalPaymentProviderConnection();
            connection.setProfessionalId(professional.getId());
            connection.setProvider(MERCADO_PAGO_PROVIDER);
            connection.setStatus(ProfessionalPaymentProviderConnectionStatus.PENDING_AUTHORIZATION);
            storePendingAuthorizationAttempt(connection, state);
            repository.save(connection);
        } else {
            ProfessionalPaymentProviderConnection connection = existing.get();
            storePendingAuthorizationAttempt(connection, state);
            repository.save(connection);
        }

        return new MercadoPagoOAuthStartResponse(
            MERCADO_PAGO_PROVIDER.name(),
            authorizationUrl,
            state.value(),
            state.expiresAt()
        );
    }

    @Transactional
    public ProfessionalPaymentProviderConnectionResponse handleMercadoPagoOAuthCallback(
        Long professionalUserId,
        String code,
        String state,
        String error,
        String errorDescription
    ) {
        ProfessionalProfile professional = loadProfessional(professionalUserId);
        ensureOnlinePaymentsEnabledForUser(professionalUserId);
        LOGGER.info(
            "Received Mercado Pago OAuth callback professionalUserId={} professionalId={} provider={} hasCode={} hasError={}",
            professionalUserId,
            professional.getId(),
            MERCADO_PAGO_PROVIDER,
            code != null && !code.isBlank(),
            error != null && !error.isBlank()
        );
        mercadoPagoOAuthStateService.validateState(state, professional.getId());

        ProfessionalPaymentProviderConnection connection = findConnection(professional.getId())
            .orElseGet(() -> initializeConnection(professional.getId()));
        boolean preserveConnectedStatus = connection.getStatus() == ProfessionalPaymentProviderConnectionStatus.CONNECTED;
        boolean hasPendingVerifier = connection.getPendingOauthCodeVerifierEncrypted() != null
            && !connection.getPendingOauthCodeVerifierEncrypted().isBlank();
        LOGGER.info(
            "Validated Mercado Pago OAuth callback professionalId={} provider={} pkceEnabled={} hasPendingVerifier={}",
            professional.getId(),
            MERCADO_PAGO_PROVIDER,
            mercadoPagoOAuthStateService.isPkceEnabled(),
            hasPendingVerifier
        );
        ensurePendingAuthorizationMatches(connection, state, preserveConnectedStatus);

        if (error != null && !error.isBlank()) {
            persistOAuthError(connection, error, errorDescription, preserveConnectedStatus);
            LOGGER.warn(
                "Mercado Pago OAuth callback returned provider error professionalId={} provider={} error={}",
                professional.getId(),
                MERCADO_PAGO_PROVIDER,
                safeForLogs(error)
            );
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Mercado Pago devolvio error OAuth: " + error +
                    ((errorDescription == null || errorDescription.isBlank()) ? "" : " - " + errorDescription)
            );
        }
        if (code == null || code.isBlank()) {
            persistOAuthError(connection, "missing_code", "Mercado Pago no devolvio code OAuth", preserveConnectedStatus);
            LOGGER.warn(
                "Mercado Pago OAuth callback missing code professionalId={} provider={}",
                professional.getId(),
                MERCADO_PAGO_PROVIDER
            );
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mercado Pago no devolvio code OAuth");
        }

        try {
            String codeVerifier = resolveCodeVerifierForCallback(connection, state, preserveConnectedStatus);
            if (mercadoPagoOAuthStateService.isPkceEnabled()
                && codeVerifier == null
                && preserveConnectedStatus
                && connection.getStatus() == ProfessionalPaymentProviderConnectionStatus.CONNECTED) {
                return toResponse(connection);
            }
            MercadoPagoOAuthClient.TokenResponse tokenResponse =
                mercadoPagoOAuthClient.exchangeAuthorizationCode(code, codeVerifier);
            String resolvedProviderUserId = tokenResponse.userId() == null
                ? connection.getProviderUserId()
                : String.valueOf(tokenResponse.userId());
            ensureProviderUserAvailableForProfessional(professional.getId(), resolvedProviderUserId);
            connection.setProvider(MERCADO_PAGO_PROVIDER);
            connection.setStatus(ProfessionalPaymentProviderConnectionStatus.CONNECTED);
            connection.setProviderUserId(resolvedProviderUserId);
            connection.setProviderAccountId(resolvedProviderUserId);
            connection.setAccessTokenEncrypted(
                mercadoPagoOAuthTokenCipher.encrypt(tokenResponse.accessToken())
            );
            connection.setRefreshTokenEncrypted(
                mercadoPagoOAuthTokenCipher.encrypt(tokenResponse.refreshToken())
            );
            connection.setTokenExpiresAt(tokenResponse.expiresAt());
            connection.setScope(tokenResponse.scope());
            connection.setConnectedAt(LocalDateTime.now());
            connection.setDisconnectedAt(null);
            connection.setLastSyncAt(LocalDateTime.now());
            connection.setLastError(null);
            connection.setMetadataJson(writeMetadata(tokenResponse));
            markPendingAuthorizationVerifierConsumed(connection, state);
            ProfessionalPaymentProviderConnection persistedConnection = repository.save(connection);
            LOGGER.info(
                "Mercado Pago OAuth connection persisted professionalId={} provider={} providerUserId={} status={}",
                professional.getId(),
                MERCADO_PAGO_PROVIDER,
                safeForLogs(persistedConnection.getProviderUserId()),
                persistedConnection.getStatus()
            );
            return toResponse(persistedConnection);
        } catch (ResponseStatusException exception) {
            if (preserveConnectedStatus && isOAuthReplayAfterSuccessfulConnection(exception)) {
                LOGGER.info(
                    "Ignoring repeated Mercado Pago OAuth callback after successful connection professionalId={} provider={} reason={}",
                    professional.getId(),
                    MERCADO_PAGO_PROVIDER,
                    safeForLogs(exception.getReason())
                );
                return toResponse(connection);
            }
            persistOAuthError(connection, "token_exchange_failed", exception.getReason(), preserveConnectedStatus);
            throw exception;
        }
    }

    @Transactional
    public ProfessionalPaymentProviderConnectionResponse disconnectMercadoPagoConnection(Long professionalUserId) {
        ProfessionalProfile professional = loadProfessional(professionalUserId);
        ProfessionalPaymentProviderConnection connection = findConnection(professional.getId())
            .orElseGet(() -> initializeConnection(professional.getId()));
        LOGGER.info(
            "Disconnecting Mercado Pago OAuth connection professionalUserId={} professionalId={} provider={} providerUserId={}",
            professionalUserId,
            professional.getId(),
            MERCADO_PAGO_PROVIDER,
            safeForLogs(connection.getProviderUserId())
        );
        connection.setStatus(ProfessionalPaymentProviderConnectionStatus.DISCONNECTED);
        connection.setAccessTokenEncrypted(null);
        connection.setRefreshTokenEncrypted(null);
        connection.setTokenExpiresAt(null);
        connection.setDisconnectedAt(LocalDateTime.now());
        connection.setLastError(null);
        connection.setLastSyncAt(LocalDateTime.now());
        clearPendingAuthorizationAttempt(connection);
        return toResponse(repository.save(connection));
    }

    @Transactional
    public MercadoPagoConnectionAccess resolveMercadoPagoAccessForProfessional(Long professionalId) {
        if (professionalId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professionalId es obligatorio");
        }
        ensureOnlinePaymentsEnabledForProfessionalId(professionalId);
        ProfessionalPaymentProviderConnection connection = findConnection(professionalId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.CONFLICT,
                "El profesional no tiene una conexion Mercado Pago activa"
            ));
        if (connection.getStatus() != ProfessionalPaymentProviderConnectionStatus.CONNECTED) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La conexion Mercado Pago del profesional no esta lista para cobrar reservas"
            );
        }
        if (connection.getAccessTokenEncrypted() == null || connection.getAccessTokenEncrypted().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La conexion Mercado Pago del profesional no tiene access token disponible"
            );
        }

        ProfessionalPaymentProviderConnection activeConnection = refreshIfNeeded(connection);
        return new MercadoPagoConnectionAccess(
            activeConnection.getProfessionalId(),
            activeConnection.getProviderAccountId(),
            activeConnection.getProviderUserId(),
            mercadoPagoOAuthTokenCipher.decrypt(activeConnection.getAccessTokenEncrypted())
        );
    }

    private void persistOAuthError(
        ProfessionalPaymentProviderConnection connection,
        String code,
        String message,
        boolean preserveConnectedStatus
    ) {
        LOGGER.warn(
            "Persisting Mercado Pago OAuth error professionalId={} provider={} code={} preserveConnectedStatus={}",
            connection.getProfessionalId(),
            MERCADO_PAGO_PROVIDER,
            safeForLogs(code),
            preserveConnectedStatus
        );
        connection.setLastError(buildErrorMessage(code, message));
        connection.setLastSyncAt(LocalDateTime.now());
        clearPendingAuthorizationAttempt(connection);
        if (!preserveConnectedStatus) {
            connection.setStatus(ProfessionalPaymentProviderConnectionStatus.ERROR);
        }
        repository.save(connection);
    }

    private ProfessionalPaymentProviderConnection refreshIfNeeded(ProfessionalPaymentProviderConnection connection) {
        if (connection.getTokenExpiresAt() == null || connection.getTokenExpiresAt().isAfter(LocalDateTime.now().plusMinutes(2))) {
            return connection;
        }
        if (connection.getRefreshTokenEncrypted() == null || connection.getRefreshTokenEncrypted().isBlank()) {
            connection.setStatus(ProfessionalPaymentProviderConnectionStatus.ERROR);
            connection.setLastError(buildErrorMessage("refresh_token_missing", "Mercado Pago requiere reconexion OAuth"));
            connection.setLastSyncAt(LocalDateTime.now());
            return repository.save(connection);
        }

        try {
            MercadoPagoOAuthClient.TokenResponse tokenResponse = mercadoPagoOAuthClient.refreshAccessToken(
                mercadoPagoOAuthTokenCipher.decrypt(connection.getRefreshTokenEncrypted())
            );
            String resolvedProviderUserId = tokenResponse.userId() == null
                ? connection.getProviderUserId()
                : String.valueOf(tokenResponse.userId());
            ensureProviderUserAvailableForProfessional(connection.getProfessionalId(), resolvedProviderUserId);
            connection.setStatus(ProfessionalPaymentProviderConnectionStatus.CONNECTED);
            connection.setProviderUserId(resolvedProviderUserId);
            connection.setProviderAccountId(resolvedProviderUserId);
            connection.setAccessTokenEncrypted(mercadoPagoOAuthTokenCipher.encrypt(tokenResponse.accessToken()));
            connection.setRefreshTokenEncrypted(
                tokenResponse.refreshToken() == null || tokenResponse.refreshToken().isBlank()
                    ? connection.getRefreshTokenEncrypted()
                    : mercadoPagoOAuthTokenCipher.encrypt(tokenResponse.refreshToken())
            );
            connection.setTokenExpiresAt(tokenResponse.expiresAt());
            connection.setScope(tokenResponse.scope());
            connection.setLastSyncAt(LocalDateTime.now());
            connection.setLastError(null);
            connection.setMetadataJson(writeMetadata(tokenResponse));
            return repository.save(connection);
        } catch (ResponseStatusException exception) {
            LOGGER.warn(
                "Mercado Pago OAuth token refresh failed professionalId={} provider={} reason={}",
                connection.getProfessionalId(),
                MERCADO_PAGO_PROVIDER,
                safeForLogs(exception.getReason())
            );
            connection.setStatus(ProfessionalPaymentProviderConnectionStatus.ERROR);
            connection.setLastError(buildErrorMessage("refresh_failed", exception.getReason()));
            connection.setLastSyncAt(LocalDateTime.now());
            repository.save(connection);
            throw exception;
        }
    }

    private void ensureProviderUserAvailableForProfessional(Long professionalId, String providerUserId) {
        if (providerUserId == null || providerUserId.isBlank()) {
            return;
        }
        Optional<ProfessionalPaymentProviderConnection> existingConnection =
            repository.findByProviderAndProviderUserId(MERCADO_PAGO_PROVIDER, providerUserId.trim());
        if (existingConnection.isEmpty()) {
            return;
        }
        ProfessionalPaymentProviderConnection otherConnection = existingConnection.get();
        if (professionalId.equals(otherConnection.getProfessionalId()) || !isActiveConnection(otherConnection)) {
            return;
        }
        LOGGER.warn(
            "Mercado Pago account already linked to another professional provider={} providerUserId={} currentProfessionalId={} ownerProfessionalId={}",
            MERCADO_PAGO_PROVIDER,
            safeForLogs(providerUserId),
            professionalId,
            otherConnection.getProfessionalId()
        );
        throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "La cuenta de Mercado Pago ya esta vinculada a otro profesional"
        );
    }

    private boolean isActiveConnection(ProfessionalPaymentProviderConnection connection) {
        return connection != null
            && connection.getStatus() != ProfessionalPaymentProviderConnectionStatus.DISCONNECTED
            && connection.getAccessTokenEncrypted() != null
            && !connection.getAccessTokenEncrypted().isBlank();
    }

    private boolean isOAuthReplayAfterSuccessfulConnection(ResponseStatusException exception) {
        if (exception == null || exception.getReason() == null) {
            return false;
        }
        String normalizedReason = exception.getReason().trim().toLowerCase();
        return normalizedReason.contains("invalid_grant")
            || normalizedReason.contains("invalid code")
            || normalizedReason.contains("code already used");
    }

    private String buildErrorMessage(String code, String message) {
        String normalizedCode = code == null || code.isBlank() ? "oauth_error" : code.trim();
        String normalizedMessage = message == null || message.isBlank() ? "Sin detalle" : message.trim();
        return (normalizedCode + ": " + normalizedMessage).substring(
            0,
            Math.min(1000, normalizedCode.length() + normalizedMessage.length() + 2)
        );
    }

    private ProfessionalPaymentProviderConnection initializeConnection(Long professionalId) {
        ProfessionalPaymentProviderConnection connection = new ProfessionalPaymentProviderConnection();
        connection.setProfessionalId(professionalId);
        connection.setProvider(MERCADO_PAGO_PROVIDER);
        connection.setStatus(ProfessionalPaymentProviderConnectionStatus.DISCONNECTED);
        return connection;
    }

    private void storePendingAuthorizationAttempt(
        ProfessionalPaymentProviderConnection connection,
        MercadoPagoOAuthStateService.GeneratedState state
    ) {
        connection.setPendingOauthState(state.value());
        connection.setPendingOauthStateExpiresAt(state.expiresAt());
        if (state.pkceChallenge() != null && state.pkceChallenge().codeVerifier() != null) {
            connection.setPendingOauthCodeVerifierEncrypted(
                mercadoPagoOAuthTokenCipher.encrypt(state.pkceChallenge().codeVerifier())
            );
        } else {
            connection.setPendingOauthCodeVerifierEncrypted(null);
        }
    }

    private void clearPendingAuthorizationAttempt(ProfessionalPaymentProviderConnection connection) {
        connection.setPendingOauthState(null);
        connection.setPendingOauthStateExpiresAt(null);
        connection.setPendingOauthCodeVerifierEncrypted(null);
    }

    private void markPendingAuthorizationVerifierConsumed(
        ProfessionalPaymentProviderConnection connection,
        String rawState
    ) {
        connection.setPendingOauthState(rawState);
        if (connection.getPendingOauthStateExpiresAt() == null) {
            connection.setPendingOauthStateExpiresAt(utcNow().plusMinutes(15));
        }
        connection.setPendingOauthCodeVerifierEncrypted(null);
    }

    private void ensurePendingAuthorizationMatches(
        ProfessionalPaymentProviderConnection connection,
        String rawState,
        boolean preserveConnectedStatus
    ) {
        String storedState = connection.getPendingOauthState();
        if (storedState == null || storedState.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No encontramos una autorizacion OAuth pendiente");
        }
        if (!storedState.equals(rawState)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth no coincide con el onboarding pendiente");
        }
        LocalDateTime expiresAt = connection.getPendingOauthStateExpiresAt();
        if (expiresAt != null && expiresAt.isBefore(utcNow())) {
            clearPendingAuthorizationAttempt(connection);
            repository.save(connection);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth expirado");
        }
    }

    private String resolveCodeVerifierForCallback(
        ProfessionalPaymentProviderConnection connection,
        String rawState,
        boolean preserveConnectedStatus
    ) {
        if (!mercadoPagoOAuthStateService.isPkceEnabled()) {
            return null;
        }
        if (connection.getPendingOauthCodeVerifierEncrypted() == null
            || connection.getPendingOauthCodeVerifierEncrypted().isBlank()) {
            if (preserveConnectedStatus
                && connection.getPendingOauthState() != null
                && connection.getPendingOauthState().equals(rawState)) {
                LOGGER.info(
                    "Treating Mercado Pago OAuth callback as replay after verifier consumption professionalId={} provider={}",
                    connection.getProfessionalId(),
                    MERCADO_PAGO_PROVIDER
                );
                return null;
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No encontramos un code_verifier pendiente para Mercado Pago");
        }
        return mercadoPagoOAuthTokenCipher.decrypt(connection.getPendingOauthCodeVerifierEncrypted());
    }

    private LocalDateTime utcNow() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private ProfessionalProfile loadProfessional(Long professionalUserId) {
        if (professionalUserId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion profesional invalida");
        }
        return professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(professionalUserId);
    }

    private void ensureOnlinePaymentsEnabledForUser(Long professionalUserId) {
        planGuardService.requireBooleanCapability(
            String.valueOf(professionalUserId),
            BooleanCapability.ONLINE_PAYMENTS
        );
    }

    private void ensureOnlinePaymentsEnabledForProfessionalId(Long professionalId) {
        ProfessionalProfile professional = professionalBillingSubjectGateway.findById(professionalId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
        if (professional.getUser() == null || professional.getUser().getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El profesional no tiene usuario asociado");
        }
        ensureOnlinePaymentsEnabledForUser(professional.getUser().getId());
    }

    private Optional<ProfessionalPaymentProviderConnection> findConnection(Long professionalId) {
        return repository.findByProfessionalIdAndProvider(professionalId, MERCADO_PAGO_PROVIDER);
    }

    private ProfessionalPaymentProviderConnectionResponse toResponse(ProfessionalPaymentProviderConnection connection) {
        if (connection == null) {
            return new ProfessionalPaymentProviderConnectionResponse(
                MERCADO_PAGO_PROVIDER.name(),
                "NOT_CONNECTED",
                false,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
            );
        }
        boolean connected = connection.getStatus() == ProfessionalPaymentProviderConnectionStatus.CONNECTED
            && connection.getAccessTokenEncrypted() != null
            && !connection.getAccessTokenEncrypted().isBlank();
        return new ProfessionalPaymentProviderConnectionResponse(
            connection.getProvider().name(),
            connection.getStatus().name(),
            connected,
            connection.getProviderAccountId(),
            connection.getProviderUserId(),
            connection.getScope(),
            connection.getTokenExpiresAt(),
            connection.getConnectedAt(),
            connection.getDisconnectedAt(),
            connection.getLastSyncAt(),
            connection.getLastError()
        );
    }

    private String writeMetadata(MercadoPagoOAuthClient.TokenResponse tokenResponse) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("tokenType", tokenResponse.tokenType());
        metadata.put("publicKey", tokenResponse.publicKey());
        metadata.put("scope", tokenResponse.scope());
        metadata.put("userId", tokenResponse.userId());
        metadata.put("connectedVia", "mercadopago_oauth");
        metadata.put("hasRefreshToken", tokenResponse.refreshToken() != null && !tokenResponse.refreshToken().isBlank());
        metadata.put("rawResponseStored", false);
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException exception) {
            return "{\"serializationError\":true}";
        }
    }

    private String safeForLogs(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() <= 10) {
            return trimmed;
        }
        return trimmed.substring(0, 4) + "..." + trimmed.substring(trimmed.length() - 4);
    }

    public record MercadoPagoConnectionAccess(
        Long professionalId,
        String providerAccountId,
        String providerUserId,
        String accessToken
    ) {}
}

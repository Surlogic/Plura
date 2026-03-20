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
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfessionalPaymentProviderConnectionService {

    private static final PaymentProvider MERCADO_PAGO_PROVIDER = PaymentProvider.MERCADOPAGO;

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
        MercadoPagoOAuthStateService.GeneratedState state =
            mercadoPagoOAuthStateService.generateState(professional.getId());
        String authorizationUrl = mercadoPagoOAuthClient.buildAuthorizationUrl(state.value());
        Optional<ProfessionalPaymentProviderConnection> existing = findConnection(professional.getId());
        if (existing.isPresent()
            && existing.get().getStatus() != ProfessionalPaymentProviderConnectionStatus.CONNECTED) {
            ProfessionalPaymentProviderConnection connection = existing.get();
            connection.setStatus(ProfessionalPaymentProviderConnectionStatus.PENDING_AUTHORIZATION);
            connection.setLastError(null);
            repository.save(connection);
        } else if (existing.isEmpty()) {
            ProfessionalPaymentProviderConnection connection = new ProfessionalPaymentProviderConnection();
            connection.setProfessionalId(professional.getId());
            connection.setProvider(MERCADO_PAGO_PROVIDER);
            connection.setStatus(ProfessionalPaymentProviderConnectionStatus.PENDING_AUTHORIZATION);
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
        mercadoPagoOAuthStateService.validateState(state, professional.getId());

        ProfessionalPaymentProviderConnection connection = findConnection(professional.getId())
            .orElseGet(() -> initializeConnection(professional.getId()));
        boolean preserveConnectedStatus = connection.getStatus() == ProfessionalPaymentProviderConnectionStatus.CONNECTED;

        if (error != null && !error.isBlank()) {
            persistOAuthError(connection, error, errorDescription, preserveConnectedStatus);
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Mercado Pago devolvio error OAuth: " + error +
                    ((errorDescription == null || errorDescription.isBlank()) ? "" : " - " + errorDescription)
            );
        }
        if (code == null || code.isBlank()) {
            persistOAuthError(connection, "missing_code", "Mercado Pago no devolvio code OAuth", preserveConnectedStatus);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mercado Pago no devolvio code OAuth");
        }

        try {
            MercadoPagoOAuthClient.TokenResponse tokenResponse =
                mercadoPagoOAuthClient.exchangeAuthorizationCode(code);
            connection.setProvider(MERCADO_PAGO_PROVIDER);
            connection.setStatus(ProfessionalPaymentProviderConnectionStatus.CONNECTED);
            connection.setProviderUserId(tokenResponse.userId() == null ? null : String.valueOf(tokenResponse.userId()));
            connection.setProviderAccountId(connection.getProviderUserId());
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
            return toResponse(repository.save(connection));
        } catch (ResponseStatusException exception) {
            persistOAuthError(connection, "token_exchange_failed", exception.getReason(), preserveConnectedStatus);
            throw exception;
        }
    }

    @Transactional
    public ProfessionalPaymentProviderConnectionResponse disconnectMercadoPagoConnection(Long professionalUserId) {
        ProfessionalProfile professional = loadProfessional(professionalUserId);
        ProfessionalPaymentProviderConnection connection = findConnection(professional.getId())
            .orElseGet(() -> initializeConnection(professional.getId()));
        connection.setStatus(ProfessionalPaymentProviderConnectionStatus.DISCONNECTED);
        connection.setAccessTokenEncrypted(null);
        connection.setRefreshTokenEncrypted(null);
        connection.setTokenExpiresAt(null);
        connection.setDisconnectedAt(LocalDateTime.now());
        connection.setLastError(null);
        connection.setLastSyncAt(LocalDateTime.now());
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
        connection.setLastError(buildErrorMessage(code, message));
        connection.setLastSyncAt(LocalDateTime.now());
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
            connection.setStatus(ProfessionalPaymentProviderConnectionStatus.CONNECTED);
            connection.setProviderUserId(tokenResponse.userId() == null ? connection.getProviderUserId() : String.valueOf(tokenResponse.userId()));
            connection.setProviderAccountId(connection.getProviderUserId());
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
            connection.setStatus(ProfessionalPaymentProviderConnectionStatus.ERROR);
            connection.setLastError(buildErrorMessage("refresh_failed", exception.getReason()));
            connection.setLastSyncAt(LocalDateTime.now());
            repository.save(connection);
            throw exception;
        }
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
        metadata.put("tokenResponse", tokenResponse.rawResponseJson());
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException exception) {
            return "{\"serializationError\":true}";
        }
    }

    public record MercadoPagoConnectionAccess(
        Long professionalId,
        String providerAccountId,
        String providerUserId,
        String accessToken
    ) {}
}

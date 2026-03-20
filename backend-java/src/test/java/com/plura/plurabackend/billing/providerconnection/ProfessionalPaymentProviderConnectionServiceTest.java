package com.plura.plurabackend.billing.providerconnection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.providerconnection.ProfessionalPaymentProviderConnectionErrorRecorder;
import com.plura.plurabackend.core.billing.providerconnection.ProfessionalPaymentProviderConnectionService;
import com.plura.plurabackend.core.billing.providerconnection.mercadopago.MercadoPagoOAuthClient;
import com.plura.plurabackend.core.billing.providerconnection.mercadopago.MercadoPagoOAuthStateService;
import com.plura.plurabackend.core.billing.providerconnection.model.ProfessionalPaymentProviderConnection;
import com.plura.plurabackend.core.billing.providerconnection.model.ProfessionalPaymentProviderConnectionStatus;
import com.plura.plurabackend.core.billing.providerconnection.repository.ProfessionalPaymentProviderConnectionRepository;
import com.plura.plurabackend.core.billing.providerconnection.security.MercadoPagoOAuthTokenCipher;
import com.plura.plurabackend.core.professional.ProfessionalBillingSubjectGateway;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.plan.PlanGuardService;
import com.plura.plurabackend.core.user.model.User;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class ProfessionalPaymentProviderConnectionServiceTest {

    private final ProfessionalBillingSubjectGateway professionalBillingSubjectGateway = mock(ProfessionalBillingSubjectGateway.class);
    private final ProfessionalPaymentProviderConnectionRepository repository = mock(ProfessionalPaymentProviderConnectionRepository.class);
    private final MercadoPagoOAuthStateService mercadoPagoOAuthStateService = mock(MercadoPagoOAuthStateService.class);
    private final MercadoPagoOAuthClient mercadoPagoOAuthClient = mock(MercadoPagoOAuthClient.class);
    private final MercadoPagoOAuthTokenCipher mercadoPagoOAuthTokenCipher = mock(MercadoPagoOAuthTokenCipher.class);
    private final PlanGuardService planGuardService = mock(PlanGuardService.class);
    private final ProfessionalPaymentProviderConnectionErrorRecorder errorRecorder =
        mock(ProfessionalPaymentProviderConnectionErrorRecorder.class);
    private final ProfessionalPaymentProviderConnectionService service = new ProfessionalPaymentProviderConnectionService(
        professionalBillingSubjectGateway,
        repository,
        mercadoPagoOAuthStateService,
        mercadoPagoOAuthClient,
        mercadoPagoOAuthTokenCipher,
        new ObjectMapper(),
        planGuardService,
        errorRecorder
    );

    @Test
    void shouldStartOAuthInPendingAuthorization() {
        ProfessionalProfile professional = professional();
        when(professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(20L)).thenReturn(professional);
        when(repository.findByProfessionalIdAndProvider(professional.getId(), PaymentProvider.MERCADOPAGO))
            .thenReturn(Optional.empty());
        when(repository.save(any(ProfessionalPaymentProviderConnection.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(mercadoPagoOAuthStateService.generateState(professional.getId()))
            .thenReturn(new MercadoPagoOAuthStateService.GeneratedState("state-1", utcNow().plusMinutes(10), null));
        when(mercadoPagoOAuthClient.buildAuthorizationUrl("state-1", null)).thenReturn("https://auth.test/mp?state=1");

        var response = service.startMercadoPagoOAuth(20L);

        assertEquals("MERCADOPAGO", response.provider());
        assertEquals("state-1", response.state());
        assertEquals("https://auth.test/mp?state=1", response.authorizationUrl());
    }

    @Test
    void shouldPersistConnectedTokensAfterOAuthCallback() {
        ProfessionalProfile professional = professional();
        ProfessionalPaymentProviderConnection connection = new ProfessionalPaymentProviderConnection();
        connection.setProfessionalId(professional.getId());
        connection.setProvider(PaymentProvider.MERCADOPAGO);
        connection.setStatus(ProfessionalPaymentProviderConnectionStatus.PENDING_AUTHORIZATION);
        connection.setPendingOauthState("state-1");
        connection.setPendingOauthStateExpiresAt(utcNow().plusMinutes(10));

        when(professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(20L)).thenReturn(professional);
        when(repository.findByProfessionalIdAndProvider(professional.getId(), PaymentProvider.MERCADOPAGO))
            .thenReturn(Optional.of(connection));
        when(repository.findByProviderAndProviderUserId(PaymentProvider.MERCADOPAGO, "998877"))
            .thenReturn(Optional.of(connection));
        when(repository.save(any(ProfessionalPaymentProviderConnection.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(mercadoPagoOAuthStateService.isPkceEnabled()).thenReturn(false);
        when(mercadoPagoOAuthClient.exchangeAuthorizationCode("code-1", null))
            .thenReturn(new MercadoPagoOAuthClient.TokenResponse(
                "access-1",
                "refresh-1",
                998877L,
                "offline_access",
                LocalDateTime.now().plusHours(1),
                "bearer",
                "public-key",
                "{\"access_token\":\"access-1\"}"
            ));
        when(mercadoPagoOAuthTokenCipher.encrypt("access-1")).thenReturn("enc-access-1");
        when(mercadoPagoOAuthTokenCipher.encrypt("refresh-1")).thenReturn("enc-refresh-1");

        var response = service.handleMercadoPagoOAuthCallback(20L, "code-1", "state-1", null, null);

        assertTrue(response.connected());
        assertEquals("CONNECTED", response.status());
        assertEquals("998877", response.providerUserId());
    }

    @Test
    void shouldRejectOAuthCallbackWithoutState() {
        ProfessionalProfile professional = professional();
        when(professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(20L)).thenReturn(professional);
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth es obligatorio"))
            .when(mercadoPagoOAuthStateService)
            .validateState(isNull(), org.mockito.ArgumentMatchers.eq(professional.getId()));

        ResponseStatusException exception = org.junit.jupiter.api.Assertions.assertThrows(
            ResponseStatusException.class,
            () -> service.handleMercadoPagoOAuthCallback(20L, "code-1", null, null, null)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("state OAuth es obligatorio", exception.getReason());
    }

    @Test
    void shouldRejectOAuthCallbackWithInvalidState() {
        ProfessionalProfile professional = professional();
        when(professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(20L)).thenReturn(professional);
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth invalido"))
            .when(mercadoPagoOAuthStateService)
            .validateState("bad-state", professional.getId());

        ResponseStatusException exception = org.junit.jupiter.api.Assertions.assertThrows(
            ResponseStatusException.class,
            () -> service.handleMercadoPagoOAuthCallback(20L, "code-1", "bad-state", null, null)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("state OAuth invalido", exception.getReason());
    }

    @Test
    void shouldRejectOAuthCallbackWhenMercadoPagoAccountBelongsToAnotherProfessional() {
        ProfessionalProfile professional = professional();
        ProfessionalPaymentProviderConnection currentConnection = new ProfessionalPaymentProviderConnection();
        currentConnection.setProfessionalId(professional.getId());
        currentConnection.setProvider(PaymentProvider.MERCADOPAGO);
        currentConnection.setStatus(ProfessionalPaymentProviderConnectionStatus.PENDING_AUTHORIZATION);
        currentConnection.setPendingOauthState("state-1");
        currentConnection.setPendingOauthStateExpiresAt(utcNow().plusMinutes(10));

        ProfessionalPaymentProviderConnection otherProfessionalConnection = new ProfessionalPaymentProviderConnection();
        otherProfessionalConnection.setProfessionalId(999L);
        otherProfessionalConnection.setProvider(PaymentProvider.MERCADOPAGO);
        otherProfessionalConnection.setStatus(ProfessionalPaymentProviderConnectionStatus.CONNECTED);
        otherProfessionalConnection.setAccessTokenEncrypted("enc-access-other");

        when(professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(20L)).thenReturn(professional);
        when(repository.findByProfessionalIdAndProvider(professional.getId(), PaymentProvider.MERCADOPAGO))
            .thenReturn(Optional.of(currentConnection));
        when(repository.findByProviderAndProviderUserId(PaymentProvider.MERCADOPAGO, "998877"))
            .thenReturn(Optional.of(otherProfessionalConnection));
        when(repository.save(any(ProfessionalPaymentProviderConnection.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(mercadoPagoOAuthStateService.isPkceEnabled()).thenReturn(false);
        when(mercadoPagoOAuthClient.exchangeAuthorizationCode("code-1", null))
            .thenReturn(new MercadoPagoOAuthClient.TokenResponse(
                "access-1",
                "refresh-1",
                998877L,
                "offline_access",
                LocalDateTime.now().plusHours(1),
                "bearer",
                "public-key",
                "{\"user_id\":998877}"
            ));

        ResponseStatusException exception = org.junit.jupiter.api.Assertions.assertThrows(
            ResponseStatusException.class,
            () -> service.handleMercadoPagoOAuthCallback(20L, "code-1", "state-1", null, null)
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertEquals("La cuenta de Mercado Pago ya esta vinculada a otro profesional", exception.getReason());
    }

    @Test
    void shouldTreatRepeatedOAuthCallbackAsIdempotentWhenConnectionIsAlreadyConnected() {
        ProfessionalProfile professional = professional();
        ProfessionalPaymentProviderConnection connection = new ProfessionalPaymentProviderConnection();
        connection.setProfessionalId(professional.getId());
        connection.setProvider(PaymentProvider.MERCADOPAGO);
        connection.setStatus(ProfessionalPaymentProviderConnectionStatus.CONNECTED);
        connection.setProviderUserId("998877");
        connection.setProviderAccountId("998877");
        connection.setAccessTokenEncrypted("enc-access-1");
        connection.setPendingOauthState("state-1");
        connection.setPendingOauthStateExpiresAt(utcNow().plusMinutes(10));

        when(professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(20L)).thenReturn(professional);
        when(repository.findByProfessionalIdAndProvider(professional.getId(), PaymentProvider.MERCADOPAGO))
            .thenReturn(Optional.of(connection));
        when(mercadoPagoOAuthStateService.isPkceEnabled()).thenReturn(false);
        when(mercadoPagoOAuthClient.exchangeAuthorizationCode("code-1", null))
            .thenThrow(new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "No se pudo completar OAuth con Mercado Pago: invalid_grant"
            ));

        var response = service.handleMercadoPagoOAuthCallback(20L, "code-1", "state-1", null, null);

        assertTrue(response.connected());
        assertEquals("CONNECTED", response.status());
        assertEquals("998877", response.providerUserId());
    }

    @Test
    void shouldPropagateTokenExchangeErrorAndPersistConnectionError() {
        ProfessionalProfile professional = professional();
        ProfessionalPaymentProviderConnection connection = new ProfessionalPaymentProviderConnection();
        connection.setId("conn-1");
        connection.setProfessionalId(professional.getId());
        connection.setProvider(PaymentProvider.MERCADOPAGO);
        connection.setStatus(ProfessionalPaymentProviderConnectionStatus.PENDING_AUTHORIZATION);
        connection.setPendingOauthState("state-1");
        connection.setPendingOauthStateExpiresAt(utcNow().plusMinutes(10));

        when(professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(20L)).thenReturn(professional);
        when(repository.findByProfessionalIdAndProvider(professional.getId(), PaymentProvider.MERCADOPAGO))
            .thenReturn(Optional.of(connection));
        when(repository.save(any(ProfessionalPaymentProviderConnection.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(mercadoPagoOAuthStateService.isPkceEnabled()).thenReturn(false);
        when(mercadoPagoOAuthClient.exchangeAuthorizationCode("code-1", null))
            .thenThrow(new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "No se pudo completar OAuth con Mercado Pago: invalid_grant"
            ));

        ResponseStatusException exception = org.junit.jupiter.api.Assertions.assertThrows(
            ResponseStatusException.class,
            () -> service.handleMercadoPagoOAuthCallback(20L, "code-1", "state-1", null, null)
        );

        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatusCode());
        assertEquals("No se pudo completar OAuth con Mercado Pago: invalid_grant", exception.getReason());
        assertEquals(ProfessionalPaymentProviderConnectionStatus.ERROR, connection.getStatus());
        assertTrue(connection.getLastError().contains("token_exchange_failed"));
        verify(errorRecorder).recordOAuthError("conn-1", connection.getLastError(), false);
    }

    @Test
    void shouldPersistUnexpectedCallbackErrors() {
        ProfessionalProfile professional = professional();
        ProfessionalPaymentProviderConnection connection = new ProfessionalPaymentProviderConnection();
        connection.setId("conn-2");
        connection.setProfessionalId(professional.getId());
        connection.setProvider(PaymentProvider.MERCADOPAGO);
        connection.setStatus(ProfessionalPaymentProviderConnectionStatus.PENDING_AUTHORIZATION);
        connection.setPendingOauthState("state-1");
        connection.setPendingOauthStateExpiresAt(utcNow().plusMinutes(10));
        connection.setPendingOauthCodeVerifierEncrypted("enc-verifier-1");

        when(professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(20L)).thenReturn(professional);
        when(repository.findByProfessionalIdAndProvider(professional.getId(), PaymentProvider.MERCADOPAGO))
            .thenReturn(Optional.of(connection));
        when(repository.save(any(ProfessionalPaymentProviderConnection.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(mercadoPagoOAuthStateService.isPkceEnabled()).thenReturn(true);
        when(mercadoPagoOAuthTokenCipher.decrypt("enc-verifier-1"))
            .thenThrow(new IllegalStateException("cipher failed"));

        ResponseStatusException exception = org.junit.jupiter.api.Assertions.assertThrows(
            ResponseStatusException.class,
            () -> service.handleMercadoPagoOAuthCallback(20L, "code-1", "state-1", null, null)
        );

        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatusCode());
        assertEquals("No se pudo completar OAuth con Mercado Pago", exception.getReason());
        assertTrue(connection.getLastError().contains("unexpected_callback_error"));
        verify(errorRecorder).recordOAuthError("conn-2", connection.getLastError(), false);
    }

    @Test
    void shouldExchangeAuthorizationCodeWithPkceVerifierWhenEnabled() {
        ProfessionalProfile professional = professional();
        ProfessionalPaymentProviderConnection connection = new ProfessionalPaymentProviderConnection();
        connection.setProfessionalId(professional.getId());
        connection.setProvider(PaymentProvider.MERCADOPAGO);
        connection.setStatus(ProfessionalPaymentProviderConnectionStatus.PENDING_AUTHORIZATION);
        connection.setPendingOauthState("state-1");
        connection.setPendingOauthStateExpiresAt(utcNow().plusMinutes(10));
        connection.setPendingOauthCodeVerifierEncrypted("enc-verifier-1");

        when(professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(20L)).thenReturn(professional);
        when(repository.findByProfessionalIdAndProvider(professional.getId(), PaymentProvider.MERCADOPAGO))
            .thenReturn(Optional.of(connection));
        when(repository.findByProviderAndProviderUserId(PaymentProvider.MERCADOPAGO, "998877"))
            .thenReturn(Optional.of(connection));
        when(repository.save(any(ProfessionalPaymentProviderConnection.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(mercadoPagoOAuthStateService.isPkceEnabled()).thenReturn(true);
        when(mercadoPagoOAuthTokenCipher.decrypt("enc-verifier-1")).thenReturn("verifier-1");
        when(mercadoPagoOAuthClient.exchangeAuthorizationCode("code-1", "verifier-1"))
            .thenReturn(new MercadoPagoOAuthClient.TokenResponse(
                "access-1",
                "refresh-1",
                998877L,
                "offline_access",
                LocalDateTime.now().plusHours(1),
                "bearer",
                "public-key",
                "{\"access_token\":\"access-1\"}"
            ));
        when(mercadoPagoOAuthTokenCipher.encrypt("access-1")).thenReturn("enc-access-1");
        when(mercadoPagoOAuthTokenCipher.encrypt("refresh-1")).thenReturn("enc-refresh-1");

        var response = service.handleMercadoPagoOAuthCallback(20L, "code-1", "state-1", null, null);

        assertTrue(response.connected());
        assertEquals("CONNECTED", response.status());
        assertEquals("998877", response.providerUserId());
        assertEquals("state-1", connection.getPendingOauthState());
        assertEquals(null, connection.getPendingOauthCodeVerifierEncrypted());
    }

    @Test
    void shouldRejectOAuthCallbackWithoutPkceVerifierWhenEnabled() {
        ProfessionalProfile professional = professional();
        ProfessionalPaymentProviderConnection connection = new ProfessionalPaymentProviderConnection();
        connection.setProfessionalId(professional.getId());
        connection.setProvider(PaymentProvider.MERCADOPAGO);
        connection.setStatus(ProfessionalPaymentProviderConnectionStatus.PENDING_AUTHORIZATION);
        connection.setPendingOauthState("state-1");
        connection.setPendingOauthStateExpiresAt(utcNow().plusMinutes(10));

        when(professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(20L)).thenReturn(professional);
        when(repository.findByProfessionalIdAndProvider(professional.getId(), PaymentProvider.MERCADOPAGO))
            .thenReturn(Optional.of(connection));
        when(repository.save(any(ProfessionalPaymentProviderConnection.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(mercadoPagoOAuthStateService.isPkceEnabled()).thenReturn(true);

        ResponseStatusException exception = org.junit.jupiter.api.Assertions.assertThrows(
            ResponseStatusException.class,
            () -> service.handleMercadoPagoOAuthCallback(20L, "code-1", "state-1", null, null)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("No encontramos un code_verifier pendiente para Mercado Pago", exception.getReason());
    }

    @Test
    void shouldRejectStartOAuthWithoutProfessionalSession() {
        ResponseStatusException exception = org.junit.jupiter.api.Assertions.assertThrows(
            ResponseStatusException.class,
            () -> service.startMercadoPagoOAuth(null)
        );

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        assertEquals("Sesion profesional invalida", exception.getReason());
    }

    private ProfessionalProfile professional() {
        User user = new User();
        user.setId(20L);
        user.setEmail("pro@test.com");

        ProfessionalProfile professional = new ProfessionalProfile();
        professional.setId(30L);
        professional.setUser(user);
        professional.setRubro("Cabello");
        professional.setSlug("pro-test");
        professional.setDisplayName("Pro Test");
        return professional;
    }

    private LocalDateTime utcNow() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }
}

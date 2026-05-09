package com.plura.plurabackend.core.billing.providerconnection;

import com.plura.plurabackend.core.billing.providerconnection.model.ProfessionalPaymentProviderConnectionStatus;
import com.plura.plurabackend.core.billing.providerconnection.repository.ProfessionalPaymentProviderConnectionRepository;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * ProfessionalPaymentProviderConnectionErrorRecorder es un componente de dominio del modulo billing / conexion de proveedor.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Colabora con: repository.
 * Foco funcional: profesionales, proveedores externos, pagos.
 */
@Service
public class ProfessionalPaymentProviderConnectionErrorRecorder {

    private final ProfessionalPaymentProviderConnectionRepository repository;

    public ProfessionalPaymentProviderConnectionErrorRecorder(
        ProfessionalPaymentProviderConnectionRepository repository
    ) {
        this.repository = repository;
    }

    /**
     * Registra o autenticacion error para auditoria, historial o notificaciones.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordOAuthError(
        String connectionId,
        String lastError,
        boolean preserveConnectedStatus
    ) {
        if (connectionId == null || connectionId.isBlank()) {
            return;
        }
        repository.findById(connectionId).ifPresent(connection -> {
            connection.setLastError(lastError);
            connection.setLastSyncAt(LocalDateTime.now());
            connection.setPendingOauthState(null);
            connection.setPendingOauthStateExpiresAt(null);
            connection.setPendingOauthCodeVerifierEncrypted(null);
            if (!preserveConnectedStatus) {
                connection.setStatus(ProfessionalPaymentProviderConnectionStatus.ERROR);
            }
            repository.save(connection);
        });
    }
}

package com.plura.plurabackend.core.billing.providerops;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperation;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationStatus;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationType;
import com.plura.plurabackend.core.billing.providerops.repository.ProviderOperationRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * ProviderOperationService es un servicio de negocio del modulo billing / operaciones de proveedor.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: providerOperationRepository.
 * Foco funcional: operaciones asincronicas, proveedores externos, servicios.
 */
@Service
public class ProviderOperationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProviderOperationService.class);

    private final ProviderOperationRepository providerOperationRepository;

    public ProviderOperationService(ProviderOperationRepository providerOperationRepository) {
        this.providerOperationRepository = providerOperationRepository;
    }

    /**
     * Crea or reuse operacion validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Transactional
    public ProviderOperation createOrReuseOperation(
        ProviderOperationType operationType,
        PaymentProvider provider,
        Long bookingId,
        String paymentTransactionId,
        String refundRecordId,
        String payoutRecordId,
        String externalReference,
        String requestPayloadJson
    ) {
        Optional<ProviderOperation> existing = providerOperationRepository.findByOperationTypeAndExternalReference(
            operationType,
            externalReference
        );
        if (existing.isPresent()) {
            ProviderOperation operation = existing.get();
            LocalDateTime now = LocalDateTime.now();
            if (paymentTransactionId != null && !paymentTransactionId.isBlank()) {
                operation.setPaymentTransactionId(paymentTransactionId);
            }
            if (refundRecordId != null && !refundRecordId.isBlank()) {
                operation.setRefundRecordId(refundRecordId);
            }
            if (payoutRecordId != null && !payoutRecordId.isBlank()) {
                operation.setPayoutRecordId(payoutRecordId);
            }
            if (bookingId != null) {
                operation.setBookingId(bookingId);
            }
            if (requestPayloadJson != null && !requestPayloadJson.isBlank()) {
                operation.setRequestPayloadJson(requestPayloadJson);
            }
            if (provider != null) {
                operation.setProvider(provider);
            }
            if (operation.getStatus() != ProviderOperationStatus.SUCCEEDED
                && !isLeaseActive(operation, now)) {
                operation.setStatus(ProviderOperationStatus.PENDING);
                operation.setProviderReference(null);
                operation.setResponsePayloadJson(null);
                operation.setLastError(null);
                operation.setCompletedAt(null);
                operation.setNextAttemptAt(now);
                operation.setLockedBy(null);
                operation.setLockedAt(null);
                operation.setLeaseUntil(null);
            }
            return providerOperationRepository.save(operation);
        }

        ProviderOperation operation = new ProviderOperation();
        operation.setOperationType(operationType);
        operation.setStatus(ProviderOperationStatus.PENDING);
        operation.setProvider(provider);
        operation.setBookingId(bookingId);
        operation.setPaymentTransactionId(paymentTransactionId);
        operation.setRefundRecordId(refundRecordId);
        operation.setPayoutRecordId(payoutRecordId);
        operation.setExternalReference(externalReference);
        operation.setRequestPayloadJson(requestPayloadJson);
        operation.setNextAttemptAt(LocalDateTime.now());
        try {
            return providerOperationRepository.save(operation);
        } catch (DataIntegrityViolationException exception) {
            return providerOperationRepository.findByOperationTypeAndExternalReference(operationType, externalReference)
                .orElseThrow(() -> exception);
        }
    }

    @Transactional(readOnly = true)
    public ProviderOperation getRequired(String operationId) {
        return providerOperationRepository.findById(operationId)
            .orElseThrow(() -> new IllegalStateException("Provider operation no encontrada"));
    }

    /**
     * Busca due operaciones aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Transactional(readOnly = true)
    public List<ProviderOperation> findDueOperations(int limit) {
        return providerOperationRepository.findDueOperations(
            List.of(
                ProviderOperationStatus.PENDING,
                ProviderOperationStatus.RETRYABLE,
                ProviderOperationStatus.PROCESSING,
                ProviderOperationStatus.UNCERTAIN
            ),
            LocalDateTime.now(),
            PageRequest.of(0, Math.max(1, limit))
        );
    }

    /**
     * Busca aged operaciones aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Transactional(readOnly = true)
    public List<ProviderOperation> findAgedOperations(
        List<ProviderOperationStatus> statuses,
        LocalDateTime updatedBefore,
        int limit
    ) {
        return providerOperationRepository.findAgedOperations(
            statuses,
            updatedBefore,
            PageRequest.of(0, Math.max(1, limit))
        );
    }

    /**
     * Ejecuta la logica de claim operacion manteniendola encapsulada en este componente.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ProviderOperation claimOperation(String operationId, String workerId, LocalDateTime leaseUntil) {
        LocalDateTime now = LocalDateTime.now();
        int claimed = providerOperationRepository.claimOperation(
            operationId,
            List.of(
                ProviderOperationStatus.PENDING,
                ProviderOperationStatus.RETRYABLE,
                ProviderOperationStatus.PROCESSING,
                ProviderOperationStatus.UNCERTAIN
            ),
            ProviderOperationStatus.PROCESSING,
            workerId,
            now,
            leaseUntil
        );
        if (claimed == 0) {
            return null;
        }
        ProviderOperation operation = getRequired(operationId);
        LOGGER.info(
            "Provider operation claimed operationId={} type={} status={} externalReference={} attemptCount={} workerId={} leaseUntil={}",
            operation.getId(),
            operation.getOperationType(),
            operation.getStatus(),
            operation.getExternalReference(),
            operation.getAttemptCount(),
            workerId,
            operation.getLeaseUntil()
        );
        return operation;
    }

    /**
     * Ejecuta la logica de renew lease manteniendola encapsulada en este componente.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean renewLease(String operationId, String workerId, LocalDateTime leaseUntil) {
        LocalDateTime now = LocalDateTime.now();
        int renewed = providerOperationRepository.renewLease(
            operationId,
            ProviderOperationStatus.PROCESSING,
            workerId,
            now,
            leaseUntil
        );
        if (renewed > 0) {
            LOGGER.debug(
                "Provider operation lease renewed operationId={} workerId={} leaseUntil={}",
                operationId,
                workerId,
                leaseUntil
            );
            return true;
        }
        return false;
    }

    /**
     * Ejecuta la logica de requeue operacion manteniendola encapsulada en este componente.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean requeueOperation(String operationId, String reason) {
        ProviderOperation operation = getRequired(operationId);
        LocalDateTime now = LocalDateTime.now();
        if (isLeaseActive(operation, now)) {
            LOGGER.info(
                "Provider operation requeue skipped due to active lease operationId={} type={} status={} externalReference={} workerId={}",
                operation.getId(),
                operation.getOperationType(),
                operation.getStatus(),
                operation.getExternalReference(),
                operation.getLockedBy()
            );
            return false;
        }
        if (operation.getStatus() == ProviderOperationStatus.SUCCEEDED) {
            LOGGER.info(
                "Provider operation requeue skipped because already succeeded operationId={} type={} externalReference={}",
                operation.getId(),
                operation.getOperationType(),
                operation.getExternalReference()
            );
            return false;
        }
        operation.setStatus(ProviderOperationStatus.PENDING);
        operation.setLastError(truncate(reason));
        operation.setCompletedAt(null);
        operation.setNextAttemptAt(now);
        operation.setLockedBy(null);
        operation.setLockedAt(null);
        operation.setLeaseUntil(null);
        providerOperationRepository.save(operation);
        LOGGER.info(
            "Provider operation requeued operationId={} type={} status={} externalReference={} attemptCount={} reason={}",
            operation.getId(),
            operation.getOperationType(),
            operation.getStatus(),
            operation.getExternalReference(),
            operation.getAttemptCount(),
            truncate(reason)
        );
        return true;
    }

    /**
     * Marca succeeded y actualiza los indicadores relacionados.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ProviderOperation markSucceeded(
        String operationId,
        String providerReference,
        String responsePayloadJson
    ) {
        ProviderOperation operation = getRequired(operationId);
        operation.setStatus(ProviderOperationStatus.SUCCEEDED);
        if (providerReference != null && !providerReference.isBlank()) {
            operation.setProviderReference(providerReference);
        }
        operation.setResponsePayloadJson(responsePayloadJson);
        operation.setCompletedAt(LocalDateTime.now());
        operation.setNextAttemptAt(null);
        operation.setLastError(null);
        operation.setLockedBy(null);
        operation.setLockedAt(null);
        operation.setLeaseUntil(null);
        ProviderOperation saved = providerOperationRepository.save(operation);
        logTransition(saved);
        return saved;
    }

    /**
     * Marca retryable y actualiza los indicadores relacionados.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ProviderOperation markRetryable(
        String operationId,
        String providerReference,
        String responsePayloadJson,
        String errorMessage,
        LocalDateTime nextAttemptAt
    ) {
        ProviderOperation operation = getRequired(operationId);
        operation.setStatus(ProviderOperationStatus.RETRYABLE);
        if (providerReference != null && !providerReference.isBlank()) {
            operation.setProviderReference(providerReference);
        }
        if (responsePayloadJson != null && !responsePayloadJson.isBlank()) {
            operation.setResponsePayloadJson(responsePayloadJson);
        }
        operation.setLastError(truncate(errorMessage));
        operation.setNextAttemptAt(nextAttemptAt);
        operation.setLockedBy(null);
        operation.setLockedAt(null);
        operation.setLeaseUntil(null);
        ProviderOperation saved = providerOperationRepository.save(operation);
        logTransition(saved);
        return saved;
    }

    /**
     * Marca failed y actualiza los indicadores relacionados.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ProviderOperation markFailed(
        String operationId,
        String providerReference,
        String responsePayloadJson,
        String errorMessage
    ) {
        ProviderOperation operation = getRequired(operationId);
        operation.setStatus(ProviderOperationStatus.FAILED);
        if (providerReference != null && !providerReference.isBlank()) {
            operation.setProviderReference(providerReference);
        }
        if (responsePayloadJson != null && !responsePayloadJson.isBlank()) {
            operation.setResponsePayloadJson(responsePayloadJson);
        }
        operation.setLastError(truncate(errorMessage));
        operation.setCompletedAt(LocalDateTime.now());
        operation.setNextAttemptAt(null);
        operation.setLockedBy(null);
        operation.setLockedAt(null);
        operation.setLeaseUntil(null);
        ProviderOperation saved = providerOperationRepository.save(operation);
        logTransition(saved);
        return saved;
    }

    /**
     * Marca uncertain y actualiza los indicadores relacionados.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ProviderOperation markUncertain(
        String operationId,
        String providerReference,
        String responsePayloadJson,
        String errorMessage,
        LocalDateTime nextAttemptAt
    ) {
        ProviderOperation operation = getRequired(operationId);
        operation.setStatus(ProviderOperationStatus.UNCERTAIN);
        if (providerReference != null && !providerReference.isBlank()) {
            operation.setProviderReference(providerReference);
        }
        if (responsePayloadJson != null && !responsePayloadJson.isBlank()) {
            operation.setResponsePayloadJson(responsePayloadJson);
        }
        operation.setLastError(truncate(errorMessage));
        operation.setNextAttemptAt(nextAttemptAt);
        operation.setLockedBy(null);
        operation.setLockedAt(null);
        operation.setLeaseUntil(null);
        ProviderOperation saved = providerOperationRepository.save(operation);
        logTransition(saved);
        return saved;
    }

    /**
     * Marca succeeded by reference y actualiza los indicadores relacionados.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markSucceededByReference(
        ProviderOperationType operationType,
        String externalReference,
        String providerReference,
        String responsePayloadJson
    ) {
        providerOperationRepository.findByOperationTypeAndExternalReference(operationType, externalReference)
            .ifPresent(operation -> {
                if (operation.getStatus() == ProviderOperationStatus.SUCCEEDED) {
                    return;
                }
                operation.setStatus(ProviderOperationStatus.SUCCEEDED);
                if (providerReference != null && !providerReference.isBlank()) {
                    operation.setProviderReference(providerReference);
                }
                if (responsePayloadJson != null && !responsePayloadJson.isBlank()) {
                    operation.setResponsePayloadJson(responsePayloadJson);
                }
                operation.setCompletedAt(LocalDateTime.now());
                operation.setLastError(null);
                operation.setNextAttemptAt(null);
                operation.setLockedBy(null);
                operation.setLockedAt(null);
                operation.setLeaseUntil(null);
                providerOperationRepository.save(operation);
                logTransition(operation);
            });
    }

    /**
     * Ejecuta la logica de truncate manteniendola encapsulada en este componente.
     */
    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() <= 1000 ? value : value.substring(0, 1000);
    }

    /**
     * Evalua is lease active y devuelve una decision booleana para el llamador.
     */
    private boolean isLeaseActive(ProviderOperation operation, LocalDateTime now) {
        return operation.getStatus() == ProviderOperationStatus.PROCESSING
            && operation.getLeaseUntil() != null
            && operation.getLeaseUntil().isAfter(now);
    }

    /**
     * Ejecuta la logica de log transition manteniendola encapsulada en este componente.
     */
    private void logTransition(ProviderOperation operation) {
        LOGGER.info(
            "Provider operation status updated operationId={} type={} status={} externalReference={} attemptCount={} workerId={} leaseUntil={} providerReference={}",
            operation.getId(),
            operation.getOperationType(),
            operation.getStatus(),
            operation.getExternalReference(),
            operation.getAttemptCount(),
            operation.getLockedBy(),
            operation.getLeaseUntil(),
            operation.getProviderReference()
        );
    }
}

package com.plura.plurabackend.core.billing.payments;

import com.plura.plurabackend.core.billing.payments.model.PaymentEvent;
import com.plura.plurabackend.core.billing.payments.repository.PaymentEventRepository;
import com.plura.plurabackend.core.billing.webhooks.ParsedWebhookEvent;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * PaymentEventLedgerService es un servicio de negocio del modulo billing / pagos.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: paymentEventRepository.
 * Foco funcional: pagos, servicios.
 */
@Service
public class PaymentEventLedgerService {

    private final PaymentEventRepository paymentEventRepository;

    public PaymentEventLedgerService(PaymentEventRepository paymentEventRepository) {
        this.paymentEventRepository = paymentEventRepository;
    }

    /**
     * Registra un evento de pago recibido para auditoria e idempotencia.
     */
    @Transactional(
        propagation = Propagation.REQUIRES_NEW,
        noRollbackFor = DataIntegrityViolationException.class
    )
    public RegistrationResult registerReceived(ParsedWebhookEvent event) {
        if (paymentEventRepository.findByProviderAndProviderEventId(
            event.provider(),
            event.providerEventId()
        ).isPresent()) {
            return new RegistrationResult(true, null);
        }

        PaymentEvent paymentEvent = new PaymentEvent();
        paymentEvent.setProvider(event.provider());
        paymentEvent.setProviderEventId(event.providerEventId());
        paymentEvent.setProviderObjectId(event.providerObjectId());
        paymentEvent.setEventType(event.eventType().name());
        paymentEvent.setPayloadHash(event.payloadHash());
        paymentEvent.setPayloadJson(event.payloadJson());
        paymentEvent.setProcessed(false);

        try {
            PaymentEvent saved = paymentEventRepository.saveAndFlush(paymentEvent);
            return new RegistrationResult(false, saved.getId());
        } catch (DataIntegrityViolationException exception) {
            return new RegistrationResult(true, null);
        }
    }

    /**
     * Marca failed y actualiza los indicadores relacionados.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(String paymentEventId, String errorMessage) {
        if (paymentEventId == null || paymentEventId.isBlank()) {
            return;
        }
        paymentEventRepository.findById(paymentEventId).ifPresent(event -> {
            event.setProcessingError(truncate(errorMessage, 1000));
            paymentEventRepository.save(event);
        });
    }

    /**
     * Ejecuta la logica de truncate manteniendola encapsulada en este componente.
     */
    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    /**
     * Bloque de datos registration result dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record RegistrationResult(boolean duplicate, String paymentEventId) {}
}

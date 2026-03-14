package com.plura.plurabackend.core.billing.payments;

import com.plura.plurabackend.core.billing.payments.model.PaymentEvent;
import com.plura.plurabackend.core.billing.payments.repository.PaymentEventRepository;
import com.plura.plurabackend.core.billing.webhooks.ParsedWebhookEvent;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentEventLedgerService {

    private final PaymentEventRepository paymentEventRepository;

    public PaymentEventLedgerService(PaymentEventRepository paymentEventRepository) {
        this.paymentEventRepository = paymentEventRepository;
    }

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

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    public record RegistrationResult(boolean duplicate, String paymentEventId) {}
}

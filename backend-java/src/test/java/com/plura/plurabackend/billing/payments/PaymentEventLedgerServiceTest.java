package com.plura.plurabackend.core.billing.payments;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.payments.repository.PaymentEventRepository;
import com.plura.plurabackend.core.billing.webhooks.ParsedWebhookEvent;
import com.plura.plurabackend.core.billing.webhooks.WebhookEventType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.dao.DataIntegrityViolationException;

class PaymentEventLedgerServiceTest {

    @Test
    void shouldReturnDuplicateWhenProviderEventAlreadyExists() {
        PaymentEventRepository repository = Mockito.mock(PaymentEventRepository.class);
        PaymentEventLedgerService service = new PaymentEventLedgerService(repository);

        ParsedWebhookEvent event = new ParsedWebhookEvent(
            PaymentProvider.MERCADOPAGO,
            "evt-1",
            "pay-1",
            WebhookEventType.PAYMENT_SUCCEEDED,
            1L,
            null,
            "sub-1",
            "pay-1",
            null,
            BigDecimal.TEN,
            "UYU",
            "PLAN_PROFESIONAL",
            false,
            LocalDateTime.now(),
            "abc",
            "{}"
        );

        when(repository.findByProviderAndProviderEventId(PaymentProvider.MERCADOPAGO, "evt-1"))
            .thenReturn(Optional.empty());
        when(repository.saveAndFlush(any()))
            .thenThrow(new DataIntegrityViolationException("duplicate"));

        PaymentEventLedgerService.RegistrationResult result = service.registerReceived(event);
        assertTrue(result.duplicate());
    }
}

package com.plura.plurabackend.core.notification.integration.billing;

import com.plura.plurabackend.core.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.core.billing.webhooks.ParsedWebhookEvent;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.notification.application.NotificationRecordCommand;
import com.plura.plurabackend.core.notification.application.NotificationService;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipient;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipientGateway;
import com.plura.plurabackend.core.user.ClientNotificationRecipient;
import com.plura.plurabackend.core.user.ClientNotificationRecipientGateway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class BillingNotificationIntegrationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BillingNotificationIntegrationService.class);

    private final NotificationService notificationService;
    private final BillingNotificationCommandFactory billingNotificationCommandFactory;
    private final ClientBillingNotificationCommandFactory clientBillingNotificationCommandFactory;
    private final ProfessionalNotificationRecipientGateway professionalNotificationRecipientGateway;
    private final ClientNotificationRecipientGateway clientNotificationRecipientGateway;

    public BillingNotificationIntegrationService(
        NotificationService notificationService,
        BillingNotificationCommandFactory billingNotificationCommandFactory,
        ClientBillingNotificationCommandFactory clientBillingNotificationCommandFactory,
        ProfessionalNotificationRecipientGateway professionalNotificationRecipientGateway,
        ClientNotificationRecipientGateway clientNotificationRecipientGateway
    ) {
        this.notificationService = notificationService;
        this.billingNotificationCommandFactory = billingNotificationCommandFactory;
        this.clientBillingNotificationCommandFactory = clientBillingNotificationCommandFactory;
        this.professionalNotificationRecipientGateway = professionalNotificationRecipientGateway;
        this.clientNotificationRecipientGateway = clientNotificationRecipientGateway;
    }

    public void recordPaymentApproved(Booking booking, PaymentTransaction transaction, ParsedWebhookEvent event, String sourceAction) {
        recordProfessional(billingNotificationCommandFactory.buildPaymentApproved(
            booking,
            transaction,
            event,
            resolveProfessionalRecipient(booking, transaction),
            sourceAction
        ));
        ClientNotificationRecipient clientRecipient = resolveClientRecipient(booking, transaction);
        if (clientRecipient != null) {
            recordClient(clientBillingNotificationCommandFactory.buildPaymentApproved(
                booking,
                transaction,
                event,
                clientRecipient,
                sourceAction
            ));
        }
    }

    public void recordPaymentFailed(Booking booking, PaymentTransaction transaction, ParsedWebhookEvent event, String sourceAction) {
        recordProfessional(billingNotificationCommandFactory.buildPaymentFailed(
            booking,
            transaction,
            event,
            resolveProfessionalRecipient(booking, transaction),
            sourceAction
        ));
        ClientNotificationRecipient clientRecipient = resolveClientRecipient(booking, transaction);
        if (clientRecipient != null) {
            recordClient(clientBillingNotificationCommandFactory.buildPaymentFailed(
                booking,
                transaction,
                event,
                clientRecipient,
                sourceAction
            ));
        }
    }

    public void recordPaymentRefunded(Booking booking, PaymentTransaction transaction, ParsedWebhookEvent event, String sourceAction) {
        recordProfessional(billingNotificationCommandFactory.buildPaymentRefunded(
            booking,
            transaction,
            event,
            resolveProfessionalRecipient(booking, transaction),
            sourceAction
        ));
        ClientNotificationRecipient clientRecipient = resolveClientRecipient(booking, transaction);
        if (clientRecipient != null) {
            recordClient(clientBillingNotificationCommandFactory.buildPaymentRefunded(
                booking,
                transaction,
                event,
                clientRecipient,
                sourceAction
            ));
        }
    }

    public void recordPaymentRefundPending(Booking booking, PaymentTransaction transaction, ParsedWebhookEvent event, String sourceAction) {
        recordProfessional(billingNotificationCommandFactory.buildPaymentRefundPending(
            booking,
            transaction,
            event,
            resolveProfessionalRecipient(booking, transaction),
            sourceAction
        ));
        ClientNotificationRecipient clientRecipient = resolveClientRecipient(booking, transaction);
        if (clientRecipient != null) {
            recordClient(clientBillingNotificationCommandFactory.buildPaymentRefundPending(
                booking,
                transaction,
                event,
                clientRecipient,
                sourceAction
            ));
        }
    }

    private ProfessionalNotificationRecipient resolveProfessionalRecipient(Booking booking, PaymentTransaction transaction) {
        Long professionalId = booking != null && booking.getProfessionalId() != null
            ? booking.getProfessionalId()
            : transaction == null ? null : transaction.getProfessionalId();
        if (professionalId == null) {
            throw new IllegalArgumentException("professionalId es obligatorio para emitir notificacion de billing");
        }
        return professionalNotificationRecipientGateway.findNotificationRecipientByProfessionalId(professionalId)
            .orElseGet(() -> {
                LOGGER.warn(
                    "Professional notification recipient no encontrado para bookingId={} professionalId={} transactionId={}",
                    booking == null ? null : booking.getId(),
                    professionalId,
                    transaction == null ? null : transaction.getId()
                );
                return new ProfessionalNotificationRecipient(professionalId, null, null);
            });
    }

    private ClientNotificationRecipient resolveClientRecipient(Booking booking, PaymentTransaction transaction) {
        if (booking == null || booking.getUser() == null || booking.getUser().getId() == null) {
            LOGGER.warn(
                "Client notification recipient no disponible para billing bookingId={} transactionId={} por ausencia de user asociado",
                booking == null ? null : booking.getId(),
                transaction == null ? null : transaction.getId()
            );
            return null;
        }
        Long userId = booking.getUser().getId();
        return clientNotificationRecipientGateway.findNotificationRecipientByUserId(userId)
            .orElseGet(() -> {
                LOGGER.warn(
                    "Client notification recipient no encontrado para billing bookingId={} userId={} transactionId={}",
                    booking.getId(),
                    userId,
                    transaction == null ? null : transaction.getId()
                );
                return new ClientNotificationRecipient(userId, null, null);
            });
    }

    private void recordProfessional(NotificationRecordCommand command) {
        notificationService.record(command);
    }

    private void recordClient(NotificationRecordCommand command) {
        notificationService.record(command);
    }
}

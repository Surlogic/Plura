package com.plura.plurabackend.core.billing.payments.repository;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransactionStatus;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransactionType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, String> {

    Optional<PaymentTransaction> findByProviderAndProviderPaymentId(
        PaymentProvider provider,
        String providerPaymentId
    );

    long countByProviderAndProviderPaymentId(
        PaymentProvider provider,
        String providerPaymentId
    );

    List<PaymentTransaction> findByBooking_IdAndTransactionTypeOrderByCreatedAtAsc(
        Long bookingId,
        PaymentTransactionType transactionType
    );

    Optional<PaymentTransaction> findTopByBooking_IdAndTransactionTypeOrderByCreatedAtDesc(
        Long bookingId,
        PaymentTransactionType transactionType
    );

    Optional<PaymentTransaction> findTopByRefundRecord_IdOrderByCreatedAtDesc(String refundRecordId);

    Optional<PaymentTransaction> findTopByPayoutRecord_IdOrderByCreatedAtDesc(String payoutRecordId);

    Optional<PaymentTransaction> findTopByExternalReferenceOrderByCreatedAtDesc(String externalReference);

    List<PaymentTransaction> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    List<PaymentTransaction> findByBooking_IdAndTransactionTypeAndStatusIn(
        Long bookingId,
        PaymentTransactionType transactionType,
        List<PaymentTransactionStatus> statuses
    );

    @Query(
        """
        SELECT DISTINCT transaction.booking.id
        FROM PaymentTransaction transaction
        WHERE transaction.booking IS NOT NULL
        """
    )
    List<Long> findDistinctBookingIds();
}

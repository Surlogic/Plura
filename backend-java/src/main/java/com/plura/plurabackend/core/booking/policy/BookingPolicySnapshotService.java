package com.plura.plurabackend.core.booking.policy;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.policy.model.BookingPolicy;
import com.plura.plurabackend.core.booking.policy.model.LateCancellationRefundMode;
import com.plura.plurabackend.core.booking.dto.BookingPolicySnapshotResponse;
import com.plura.plurabackend.core.booking.policy.repository.BookingPolicyRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
public class BookingPolicySnapshotService {

    private final BookingPolicyRepository bookingPolicyRepository;
    private final ObjectMapper objectMapper;

    public BookingPolicySnapshotService(
        BookingPolicyRepository bookingPolicyRepository,
        ObjectMapper objectMapper
    ) {
        this.bookingPolicyRepository = bookingPolicyRepository;
        this.objectMapper = objectMapper;
    }

    public BookingPolicySnapshot buildForProfessionalId(Long professionalId) {
        BookingPolicy policy = bookingPolicyRepository.findByProfessionalId(professionalId)
            .orElse(null);

        return normalizeSnapshot(new BookingPolicySnapshot(
            policy == null ? null : policy.getId(),
            policy == null ? null : policy.getVersion(),
            professionalId,
            LocalDateTime.now(),
            policy == null || Boolean.TRUE.equals(policy.getAllowClientCancellation()),
            policy == null || Boolean.TRUE.equals(policy.getAllowClientReschedule()),
            policy == null ? null : policy.getCancellationWindowHours(),
            policy == null ? null : policy.getRescheduleWindowHours(),
            policy == null
                ? BookingPolicyDefaults.DEFAULT_MAX_CLIENT_RESCHEDULES
                : BookingPolicyDefaults.resolveMaxClientReschedules(policy.getMaxClientReschedules()),
            resolveLateCancellationRefundMode(policy),
            resolveLateCancellationRefundValue(policy)
        ));
    }

    public void applySnapshot(Booking booking, BookingPolicySnapshot snapshot) {
        if (booking == null || snapshot == null) {
            return;
        }
        try {
            booking.setPolicySnapshotJson(objectMapper.writeValueAsString(snapshot));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("No se pudo serializar policySnapshotJson", exception);
        }
    }

    public ResolvedBookingPolicy resolveForBooking(Booking booking) {
        if (booking == null) {
            throw new IllegalArgumentException("booking es obligatorio");
        }
        if (booking.getPolicySnapshotJson() != null && !booking.getPolicySnapshotJson().isBlank()) {
            try {
                BookingPolicySnapshot snapshot = objectMapper.readValue(
                    booking.getPolicySnapshotJson(),
                    BookingPolicySnapshot.class
                );
                return new ResolvedBookingPolicy(
                    normalizeSnapshot(snapshot),
                    ResolvedBookingPolicy.PolicySnapshotSource.SNAPSHOT
                );
            } catch (JsonProcessingException exception) {
                // Caemos a policy viva para no romper reservas antiguas o snapshots dañados.
            }
        }

        Long professionalId = booking.getProfessionalId();
        BookingPolicySnapshot liveSnapshot = buildForProfessionalId(professionalId);
        return new ResolvedBookingPolicy(liveSnapshot, ResolvedBookingPolicy.PolicySnapshotSource.LIVE_FALLBACK);
    }

    public BookingPolicySnapshotResponse toResponse(ResolvedBookingPolicy resolvedPolicy) {
        if (resolvedPolicy == null || resolvedPolicy.snapshot() == null) {
            return null;
        }
        return toResponse(resolvedPolicy.snapshot(), resolvedPolicy.source().name());
    }

    public BookingPolicySnapshotResponse toResponse(BookingPolicySnapshot snapshot) {
        return toResponse(snapshot, null);
    }

    private BookingPolicySnapshot normalizeSnapshot(BookingPolicySnapshot snapshot) {
        if (snapshot == null) {
            return null;
        }

        int normalizedMaxClientReschedules = BookingPolicyDefaults.resolveMaxClientReschedules(
            snapshot.maxClientReschedules()
        );

        if (snapshot.sourcePolicyId() == null
            && snapshot.allowClientReschedule()
            && normalizedMaxClientReschedules == 0) {
            normalizedMaxClientReschedules = BookingPolicyDefaults.DEFAULT_MAX_CLIENT_RESCHEDULES;
        }

        if (snapshot.maxClientReschedules() != null
            && normalizedMaxClientReschedules == snapshot.maxClientReschedules()) {
            return snapshot;
        }

        return new BookingPolicySnapshot(
            snapshot.sourcePolicyId(),
            snapshot.sourcePolicyVersion(),
            snapshot.professionalId(),
            snapshot.resolvedAt(),
            snapshot.allowClientCancellation(),
            snapshot.allowClientReschedule(),
            snapshot.cancellationWindowHours(),
            snapshot.rescheduleWindowHours(),
            normalizedMaxClientReschedules,
            normalizeRefundMode(snapshot.lateCancellationRefundMode()),
            normalizeRefundValue(
                normalizeRefundMode(snapshot.lateCancellationRefundMode()),
                snapshot.lateCancellationRefundValue()
            )
        );
    }

    private BookingPolicySnapshotResponse toResponse(BookingPolicySnapshot snapshot, String policySource) {
        if (snapshot == null) {
            return null;
        }
        LateCancellationRefundMode mode = normalizeRefundMode(snapshot.lateCancellationRefundMode());
        return new BookingPolicySnapshotResponse(
            snapshot.sourcePolicyId(),
            snapshot.sourcePolicyVersion(),
            snapshot.professionalId(),
            snapshot.resolvedAt(),
            policySource,
            snapshot.allowClientCancellation(),
            snapshot.allowClientReschedule(),
            snapshot.cancellationWindowHours(),
            snapshot.rescheduleWindowHours(),
            BookingPolicyDefaults.resolveMaxClientReschedules(snapshot.maxClientReschedules()),
            mode == null ? null : mode.name(),
            normalizeRefundValue(mode, snapshot.lateCancellationRefundValue())
        );
    }

    private LateCancellationRefundMode resolveLateCancellationRefundMode(BookingPolicy policy) {
        if (policy == null || policy.getLateCancellationRefundMode() == null) {
            return policy != null && Boolean.TRUE.equals(policy.getRetainDepositOnLateCancellation())
                ? LateCancellationRefundMode.NONE
                : BookingPolicyDefaults.DEFAULT_LATE_CANCELLATION_REFUND_MODE;
        }
        return policy.getLateCancellationRefundMode();
    }

    private BigDecimal resolveLateCancellationRefundValue(BookingPolicy policy) {
        if (policy == null) {
            return BookingPolicyDefaults.DEFAULT_LATE_CANCELLATION_REFUND_VALUE;
        }
        return normalizeRefundValue(
            resolveLateCancellationRefundMode(policy),
            policy.getLateCancellationRefundValue()
        );
    }

    private LateCancellationRefundMode normalizeRefundMode(LateCancellationRefundMode mode) {
        return mode == null ? BookingPolicyDefaults.DEFAULT_LATE_CANCELLATION_REFUND_MODE : mode;
    }

    private BigDecimal normalizeRefundValue(LateCancellationRefundMode mode, BigDecimal value) {
        if (mode == null) {
            mode = BookingPolicyDefaults.DEFAULT_LATE_CANCELLATION_REFUND_MODE;
        }
        if (mode == LateCancellationRefundMode.NONE) {
            return BigDecimal.ZERO;
        }
        if (mode == LateCancellationRefundMode.FULL) {
            return BookingPolicyDefaults.DEFAULT_LATE_CANCELLATION_REFUND_VALUE;
        }
        if (value == null) {
            return BookingPolicyDefaults.DEFAULT_LATE_CANCELLATION_REFUND_VALUE;
        }
        if (value.signum() < 0) {
            return BigDecimal.ZERO;
        }
        return value.min(BigDecimal.valueOf(100));
    }
}

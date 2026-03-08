package com.plura.plurabackend.booking.policy;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.policy.model.BookingPolicy;
import com.plura.plurabackend.booking.policy.repository.BookingPolicyRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
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

    public BookingPolicySnapshot buildForProfessional(ProfessionalProfile professional) {
        BookingPolicy policy = bookingPolicyRepository.findByProfessional_Id(professional.getId())
            .orElse(null);

        return new BookingPolicySnapshot(
            policy == null ? null : policy.getId(),
            policy == null ? null : policy.getVersion(),
            professional.getId(),
            LocalDateTime.now(),
            policy == null || Boolean.TRUE.equals(policy.getAllowClientCancellation()),
            policy == null || Boolean.TRUE.equals(policy.getAllowClientReschedule()),
            policy == null ? null : policy.getCancellationWindowHours(),
            policy == null ? null : policy.getRescheduleWindowHours(),
            policy == null || policy.getMaxClientReschedules() == null ? 0 : policy.getMaxClientReschedules(),
            policy != null && Boolean.TRUE.equals(policy.getRetainDepositOnLateCancellation())
        );
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
                return new ResolvedBookingPolicy(snapshot, ResolvedBookingPolicy.PolicySnapshotSource.SNAPSHOT);
            } catch (JsonProcessingException exception) {
                // Caemos a policy viva para no romper reservas antiguas o snapshots dañados.
            }
        }

        ProfessionalProfile professional = booking.getProfessional();
        BookingPolicySnapshot liveSnapshot = buildForProfessional(professional);
        return new ResolvedBookingPolicy(liveSnapshot, ResolvedBookingPolicy.PolicySnapshotSource.LIVE_FALLBACK);
    }
}

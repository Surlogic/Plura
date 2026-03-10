package com.plura.plurabackend.professional.application;

import com.plura.plurabackend.booking.dto.BookingPolicyResponse;
import com.plura.plurabackend.booking.dto.BookingPolicyUpdateRequest;
import com.plura.plurabackend.booking.policy.BookingPolicyDefaults;
import com.plura.plurabackend.booking.policy.model.BookingPolicy;
import com.plura.plurabackend.booking.policy.model.LateCancellationRefundMode;
import com.plura.plurabackend.booking.policy.repository.BookingPolicyRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.math.BigDecimal;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ProfileBookingPolicySupport {

    private final BookingPolicyRepository bookingPolicyRepository;

    public ProfileBookingPolicySupport(BookingPolicyRepository bookingPolicyRepository) {
        this.bookingPolicyRepository = bookingPolicyRepository;
    }

    public BookingPolicyResponse getPolicy(ProfessionalProfile profile) {
        return toBookingPolicyResponse(
            bookingPolicyRepository.findByProfessional_Id(profile.getId())
                .orElseGet(() -> defaultBookingPolicy(profile))
        );
    }

    public BookingPolicyResponse updatePolicy(ProfessionalProfile profile, BookingPolicyUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload inválido");
        }

        BookingPolicy policy = resolveOrCreateBookingPolicy(profile);

        if (request.getAllowClientCancellation() != null) {
            policy.setAllowClientCancellation(request.getAllowClientCancellation());
        }
        if (request.getAllowClientReschedule() != null) {
            policy.setAllowClientReschedule(request.getAllowClientReschedule());
        }
        if (request.getCancellationWindowHours() != null) {
            policy.setCancellationWindowHours(request.getCancellationWindowHours());
        }
        if (request.getRescheduleWindowHours() != null) {
            policy.setRescheduleWindowHours(request.getRescheduleWindowHours());
        }
        if (request.getMaxClientReschedules() != null) {
            policy.setMaxClientReschedules(request.getMaxClientReschedules());
        }
        if (request.getLateCancellationRefundMode() != null && !request.getLateCancellationRefundMode().isBlank()) {
            try {
                policy.setLateCancellationRefundMode(
                    LateCancellationRefundMode.valueOf(request.getLateCancellationRefundMode().trim().toUpperCase(Locale.ROOT))
                );
            } catch (IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lateCancellationRefundMode inválido");
            }
        }
        if (request.getLateCancellationRefundValue() != null) {
            policy.setLateCancellationRefundValue(request.getLateCancellationRefundValue());
        }
        if (policy.getLateCancellationRefundMode() == null) {
            policy.setLateCancellationRefundMode(BookingPolicyDefaults.DEFAULT_LATE_CANCELLATION_REFUND_MODE);
        }
        if (policy.getLateCancellationRefundMode() == LateCancellationRefundMode.NONE) {
            policy.setLateCancellationRefundValue(BigDecimal.ZERO);
        } else if (policy.getLateCancellationRefundMode() == LateCancellationRefundMode.FULL) {
            policy.setLateCancellationRefundValue(BookingPolicyDefaults.DEFAULT_LATE_CANCELLATION_REFUND_VALUE);
        } else if (policy.getLateCancellationRefundValue() == null) {
            policy.setLateCancellationRefundValue(BookingPolicyDefaults.DEFAULT_LATE_CANCELLATION_REFUND_VALUE);
        }

        return toBookingPolicyResponse(bookingPolicyRepository.save(policy));
    }

    private BookingPolicy resolveOrCreateBookingPolicy(ProfessionalProfile profile) {
        return bookingPolicyRepository.findByProfessional_Id(profile.getId())
            .orElseGet(() -> bookingPolicyRepository.save(defaultBookingPolicy(profile)));
    }

    private BookingPolicy defaultBookingPolicy(ProfessionalProfile profile) {
        BookingPolicy policy = new BookingPolicy();
        policy.setProfessional(profile);
        policy.setAllowClientCancellation(BookingPolicyDefaults.DEFAULT_ALLOW_CLIENT_CANCELLATION);
        policy.setAllowClientReschedule(BookingPolicyDefaults.DEFAULT_ALLOW_CLIENT_RESCHEDULE);
        policy.setMaxClientReschedules(BookingPolicyDefaults.DEFAULT_MAX_CLIENT_RESCHEDULES);
        policy.setLateCancellationRefundMode(BookingPolicyDefaults.DEFAULT_LATE_CANCELLATION_REFUND_MODE);
        policy.setLateCancellationRefundValue(BookingPolicyDefaults.DEFAULT_LATE_CANCELLATION_REFUND_VALUE);
        policy.setRetainDepositOnLateCancellation(false);
        return policy;
    }

    private BookingPolicyResponse toBookingPolicyResponse(BookingPolicy policy) {
        return new BookingPolicyResponse(
            policy.getId(),
            Boolean.TRUE.equals(policy.getAllowClientCancellation()),
            Boolean.TRUE.equals(policy.getAllowClientReschedule()),
            policy.getCancellationWindowHours(),
            policy.getRescheduleWindowHours(),
            policy.getMaxClientReschedules(),
            policy.getLateCancellationRefundMode() == null
                ? LateCancellationRefundMode.FULL.name()
                : policy.getLateCancellationRefundMode().name(),
            policy.getLateCancellationRefundValue()
        );
    }
}

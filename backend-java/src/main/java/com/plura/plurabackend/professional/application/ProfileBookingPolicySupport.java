package com.plura.plurabackend.professional.application;

import com.plura.plurabackend.core.booking.dto.BookingPolicyResponse;
import com.plura.plurabackend.core.booking.dto.BookingPolicyUpdateRequest;
import com.plura.plurabackend.core.booking.policy.BookingPolicyDefaults;
import com.plura.plurabackend.core.booking.policy.model.BookingPolicy;
import com.plura.plurabackend.core.booking.policy.model.LateCancellationRefundMode;
import com.plura.plurabackend.core.booking.policy.repository.BookingPolicyRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.math.BigDecimal;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * ProfileBookingPolicySupport es un componente de dominio del modulo profesionales / aplicacion.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Colabora con: bookingPolicyRepository.
 * Foco funcional: reservas, perfiles.
 */
@Component
public class ProfileBookingPolicySupport {

    private final BookingPolicyRepository bookingPolicyRepository;

    public ProfileBookingPolicySupport(BookingPolicyRepository bookingPolicyRepository) {
        this.bookingPolicyRepository = bookingPolicyRepository;
    }

    public BookingPolicyResponse getPolicy(ProfessionalProfile profile) {
        return toBookingPolicyResponse(
            bookingPolicyRepository.findByProfessionalId(profile.getId())
                .orElseGet(() -> defaultBookingPolicy(profile))
        );
    }

    /**
     * Actualiza politica manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
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

    /**
     * Resuelve or create reserva politica normalizando entradas, defaults y casos borde.
     */
    private BookingPolicy resolveOrCreateBookingPolicy(ProfessionalProfile profile) {
        return bookingPolicyRepository.findByProfessionalId(profile.getId())
            .orElseGet(() -> bookingPolicyRepository.save(defaultBookingPolicy(profile)));
    }

    /**
     * Ejecuta la logica de default reserva politica manteniendola encapsulada en este componente.
     */
    private BookingPolicy defaultBookingPolicy(ProfessionalProfile profile) {
        BookingPolicy policy = new BookingPolicy();
        policy.setProfessionalId(profile.getId());
        policy.setAllowClientCancellation(BookingPolicyDefaults.DEFAULT_ALLOW_CLIENT_CANCELLATION);
        policy.setAllowClientReschedule(BookingPolicyDefaults.DEFAULT_ALLOW_CLIENT_RESCHEDULE);
        policy.setMaxClientReschedules(BookingPolicyDefaults.DEFAULT_MAX_CLIENT_RESCHEDULES);
        policy.setLateCancellationRefundMode(BookingPolicyDefaults.DEFAULT_LATE_CANCELLATION_REFUND_MODE);
        policy.setLateCancellationRefundValue(BookingPolicyDefaults.DEFAULT_LATE_CANCELLATION_REFUND_VALUE);
        policy.setRetainDepositOnLateCancellation(false);
        return policy;
    }

    /**
     * Convierte datos internos al formato reserva politica respuesta esperado por el consumidor.
     */
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

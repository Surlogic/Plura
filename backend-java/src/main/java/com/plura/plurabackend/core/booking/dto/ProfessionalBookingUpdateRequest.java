package com.plura.plurabackend.core.booking.dto;

import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * ProfessionalBookingUpdateRequest es un DTO de entrada del modulo reservas / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: profesionales, reservas.
 */
@Data
public class ProfessionalBookingUpdateRequest {

    @NotNull
    private BookingOperationalStatus status;
}

package com.plura.plurabackend.core.booking.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * BookingPaymentSessionRequest es un DTO de entrada del modulo reservas / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: sesiones, reservas, pagos.
 */
@Data
public class BookingPaymentSessionRequest {

    @Size(max = 30)
    @Pattern(regexp = "^(|[A-Z_]+)$")
    private String provider;
}

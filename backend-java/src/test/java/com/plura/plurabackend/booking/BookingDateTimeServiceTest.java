package com.plura.plurabackend.booking;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import org.junit.jupiter.api.Test;

/**
 * Tests de reservas.
 * Cubren escenarios de reserva date time servicio para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class BookingDateTimeServiceTest {

    private final BookingDateTimeService service = new BookingDateTimeService("America/Montevideo");

    /**
     * Escenario: debe interpret naive date time inside provided timezone y persist utc instant.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldInterpretNaiveDateTimeInsideProvidedTimezoneAndPersistUtcInstant() {
        var resolved = service.parseBookingStart("2026-03-10T15:00:00", "America/Argentina/Buenos_Aires");

        assertEquals("America/Argentina/Buenos_Aires", resolved.timezone());
        assertEquals("2026-03-10T18:00:00Z", resolved.utcInstant().toString());
        assertEquals("2026-03-10T15:00", resolved.localDateTime().toString());
    }

    /**
     * Escenario: debe normalize offset date time into effective timezone.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldNormalizeOffsetDateTimeIntoEffectiveTimezone() {
        var resolved = service.parseBookingStart("2026-03-10T18:00:00Z", "America/Montevideo");

        assertEquals("America/Montevideo", resolved.timezone());
        assertEquals("2026-03-10T18:00:00Z", resolved.utcInstant().toString());
        assertEquals("2026-03-10T15:00", resolved.localDateTime().toString());
    }
}

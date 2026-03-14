package com.plura.plurabackend.booking;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import org.junit.jupiter.api.Test;

class BookingDateTimeServiceTest {

    private final BookingDateTimeService service = new BookingDateTimeService("America/Montevideo");

    @Test
    void shouldInterpretNaiveDateTimeInsideProvidedTimezoneAndPersistUtcInstant() {
        var resolved = service.parseBookingStart("2026-03-10T15:00:00", "America/Argentina/Buenos_Aires");

        assertEquals("America/Argentina/Buenos_Aires", resolved.timezone());
        assertEquals("2026-03-10T18:00:00Z", resolved.utcInstant().toString());
        assertEquals("2026-03-10T15:00", resolved.localDateTime().toString());
    }

    @Test
    void shouldNormalizeOffsetDateTimeIntoEffectiveTimezone() {
        var resolved = service.parseBookingStart("2026-03-10T18:00:00Z", "America/Montevideo");

        assertEquals("America/Montevideo", resolved.timezone());
        assertEquals("2026-03-10T18:00:00Z", resolved.utcInstant().toString());
        assertEquals("2026-03-10T15:00", resolved.localDateTime().toString());
    }
}

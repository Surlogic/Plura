package com.plura.plurabackend.core.booking.time;

import com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.core.booking.model.Booking;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingDateTimeService {

    private final ZoneId appZoneId;

    public BookingDateTimeService(@Value("${app.timezone:America/Montevideo}") String appTimezone) {
        this.appZoneId = ZoneId.of(appTimezone);
    }

    public ResolvedBookingDateTime parseBookingStart(String rawDateTime, String rawTimezone) {
        if (rawDateTime == null || rawDateTime.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startDateTime inválido");
        }

        ZoneId zoneId = resolveZoneId(rawTimezone);
        String value = rawDateTime.trim();
        try {
            LocalDateTime localDateTime = LocalDateTime.parse(value);
            return new ResolvedBookingDateTime(
                localDateTime,
                localDateTime.atZone(zoneId).toInstant(),
                zoneId.getId()
            );
        } catch (DateTimeParseException ignored) {
            // Sigue con formatos que ya traen offset o zona.
        }

        try {
            OffsetDateTime offsetDateTime = OffsetDateTime.parse(value);
            ZonedDateTime zonedDateTime = offsetDateTime.atZoneSameInstant(zoneId);
            return new ResolvedBookingDateTime(
                zonedDateTime.toLocalDateTime(),
                offsetDateTime.toInstant(),
                zoneId.getId()
            );
        } catch (DateTimeParseException ignored) {
            // Intenta parsear ZonedDateTime completo.
        }

        try {
            ZonedDateTime zonedDateTime = ZonedDateTime.parse(value).withZoneSameInstant(zoneId);
            return new ResolvedBookingDateTime(
                zonedDateTime.toLocalDateTime(),
                zonedDateTime.toInstant(),
                zoneId.getId()
            );
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startDateTime inválido");
        }
    }

    public Instant resolveStartInstant(Booking booking) {
        if (booking == null) {
            return null;
        }
        if (booking.getStartDateTimeUtc() != null) {
            return booking.getStartDateTimeUtc();
        }
        if (booking.getStartDateTime() == null) {
            return null;
        }
        return booking.getStartDateTime().atZone(resolveZoneId(booking.getTimezone())).toInstant();
    }

    public int resolveEffectiveDurationMinutes(Booking booking) {
        if (booking == null) {
            return 30;
        }
        return ProfessionalBookingResponse.resolveEffectiveDurationMinutes(
            booking.getServiceDurationSnapshot(),
            booking.getServicePostBufferMinutesSnapshot()
        );
    }

    public LocalDateTime resolveEndDateTime(Booking booking) {
        if (booking == null || booking.getStartDateTime() == null) {
            return null;
        }
        return booking.getStartDateTime().plusMinutes(resolveEffectiveDurationMinutes(booking));
    }

    public Instant resolveEndInstant(Booking booking) {
        Instant startInstant = resolveStartInstant(booking);
        if (startInstant == null) {
            return null;
        }
        return startInstant.plusSeconds(resolveEffectiveDurationMinutes(booking) * 60L);
    }

    public String toUtcString(Booking booking) {
        Instant instant = resolveStartInstant(booking);
        return instant == null ? null : instant.toString();
    }

    public ZoneId resolveZoneId(String rawTimezone) {
        if (rawTimezone == null || rawTimezone.isBlank()) {
            return appZoneId;
        }
        try {
            return ZoneId.of(rawTimezone.trim());
        } catch (Exception ignored) {
            return appZoneId;
        }
    }

    public record ResolvedBookingDateTime(
        LocalDateTime localDateTime,
        Instant utcInstant,
        String timezone
    ) {}
}

package com.plura.plurabackend.booking.dto;

import com.plura.plurabackend.booking.model.BookingStatus;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ProfessionalBookingResponse {
    private Long id;
    private String userId;
    private String clientName;
    private String serviceId;
    private String serviceName;
    private String startDateTime;
    private String duration;
    private Integer postBufferMinutes;
    private Integer effectiveDurationMinutes;
    private String status;

    public ProfessionalBookingResponse(
        Long id,
        Long userId,
        String clientName,
        String serviceId,
        String serviceName,
        LocalDateTime startDateTime,
        String duration,
        Integer postBufferMinutes,
        BookingStatus status
    ) {
        this(
            id,
            userId == null ? null : String.valueOf(userId),
            clientName,
            serviceId,
            serviceName,
            startDateTime == null ? "" : startDateTime.toString(),
            duration,
            postBufferMinutes == null ? 0 : postBufferMinutes,
            resolveEffectiveDurationMinutes(duration, postBufferMinutes),
            status == null ? "" : status.name()
        );
    }

    public static int resolveEffectiveDurationMinutes(String duration, Integer postBufferMinutes) {
        int baseDuration = parseDurationToMinutes(duration);
        int buffer = postBufferMinutes == null ? 0 : Math.max(0, postBufferMinutes);
        return baseDuration + buffer;
    }

    private static int parseDurationToMinutes(String duration) {
        if (duration == null || duration.isBlank()) {
            return 30;
        }

        String normalized = duration.trim().toLowerCase();
        if (normalized.matches("^\\d+$")) {
            int minutes = Integer.parseInt(normalized);
            return minutes > 0 ? minutes : 30;
        }

        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\d+").matcher(normalized);
        java.util.List<Integer> numbers = new java.util.ArrayList<>();
        while (matcher.find()) {
            numbers.add(Integer.parseInt(matcher.group()));
        }
        if (numbers.isEmpty()) {
            return 30;
        }

        if (normalized.contains("h")) {
            int hours = numbers.get(0);
            int extraMinutes = numbers.size() > 1 ? numbers.get(1) : 0;
            int minutes = (hours * 60) + extraMinutes;
            return minutes > 0 ? minutes : 30;
        }

        int minutes = numbers.get(0);
        return minutes > 0 ? minutes : 30;
    }

    public ProfessionalBookingResponse(
        Long id,
        String userId,
        String clientName,
        String serviceId,
        String serviceName,
        String startDateTime,
        String duration,
        Integer postBufferMinutes,
        Integer effectiveDurationMinutes,
        String status
    ) {
        this.id = id;
        this.userId = userId;
        this.clientName = clientName;
        this.serviceId = serviceId;
        this.serviceName = serviceName;
        this.startDateTime = startDateTime;
        this.duration = duration;
        this.postBufferMinutes = postBufferMinutes == null ? 0 : Math.max(0, postBufferMinutes);
        this.effectiveDurationMinutes = effectiveDurationMinutes == null
            ? resolveEffectiveDurationMinutes(duration, this.postBufferMinutes)
            : effectiveDurationMinutes;
        this.status = status;
    }
}

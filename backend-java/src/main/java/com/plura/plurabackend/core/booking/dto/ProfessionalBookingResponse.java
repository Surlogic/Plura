package com.plura.plurabackend.core.booking.dto;

import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ProfessionalBookingResponse {
    private Long id;
    private String userId;
    private String clientName;
    private String serviceId;
    private String serviceName;
    private String startDateTime;
    private String startDateTimeUtc;
    private String timezone;
    private String duration;
    private Integer postBufferMinutes;
    private Integer effectiveDurationMinutes;
    private String paymentType;
    private Integer rescheduleCount;
    private String status;
    private String paymentStatus;
    private String refundStatus;
    private String payoutStatus;
    private BookingFinancialSummaryResponse financialSummary;
    private BookingRefundRecordResponse latestRefund;
    private BookingPayoutRecordResponse latestPayout;
    private BookingPolicySnapshotResponse policySnapshot;

    public ProfessionalBookingResponse(
        Long id,
        Long userId,
        String clientName,
        String serviceId,
        String serviceName,
        LocalDateTime startDateTime,
        String timezone,
        String duration,
        Integer postBufferMinutes,
        ServicePaymentType paymentType,
        Integer rescheduleCount,
        BookingOperationalStatus status
    ) {
        this(
            id,
            userId == null ? null : String.valueOf(userId),
            clientName,
            serviceId,
            serviceName,
            startDateTime == null ? "" : startDateTime.toString(),
            null,
            timezone,
            duration,
            postBufferMinutes == null ? 0 : postBufferMinutes,
            resolveEffectiveDurationMinutes(duration, postBufferMinutes),
            paymentType == null ? ServicePaymentType.ON_SITE.name() : paymentType.name(),
            rescheduleCount == null ? 0 : Math.max(0, rescheduleCount),
            status == null ? "" : status.name(),
            null,
            null,
            null,
            null
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
        String startDateTimeUtc,
        String timezone,
        String duration,
        Integer postBufferMinutes,
        Integer effectiveDurationMinutes,
        String paymentType,
        Integer rescheduleCount,
        String status,
        String paymentStatus,
        String refundStatus,
        String payoutStatus,
        BookingFinancialSummaryResponse financialSummary
    ) {
        this.id = id;
        this.userId = userId;
        this.clientName = clientName;
        this.serviceId = serviceId;
        this.serviceName = serviceName;
        this.startDateTime = startDateTime;
        this.startDateTimeUtc = startDateTimeUtc;
        this.timezone = timezone;
        this.duration = duration;
        this.postBufferMinutes = postBufferMinutes == null ? 0 : Math.max(0, postBufferMinutes);
        this.effectiveDurationMinutes = effectiveDurationMinutes == null
            ? resolveEffectiveDurationMinutes(duration, this.postBufferMinutes)
            : effectiveDurationMinutes;
        this.paymentType = paymentType;
        this.rescheduleCount = rescheduleCount == null ? 0 : Math.max(0, rescheduleCount);
        this.status = status;
        this.paymentStatus = paymentStatus;
        this.refundStatus = refundStatus;
        this.payoutStatus = payoutStatus;
        this.financialSummary = financialSummary;
    }
}

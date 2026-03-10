package com.plura.plurabackend.booking.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BookingActionsResponse {
    private Long bookingId;
    private String actorType;
    private String operationalStatus;
    private String policySource;
    private BookingPolicySnapshotResponse policySnapshot;
    private boolean canCancel;
    private boolean canReschedule;
    private boolean canMarkNoShow;
    private BigDecimal refundPreviewAmount;
    private BigDecimal retainPreviewAmount;
    private String currency;
    private String suggestedAction;
    private List<String> reasonCodes;
    private String messageCode;
    private Map<String, String> messageParams;
    private String plainTextFallback;
}

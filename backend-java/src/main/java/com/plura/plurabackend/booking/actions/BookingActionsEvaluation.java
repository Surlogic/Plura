package com.plura.plurabackend.booking.actions;

import com.plura.plurabackend.booking.actions.model.BookingActionReasonCode;
import com.plura.plurabackend.booking.actions.model.BookingSuggestedAction;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record BookingActionsEvaluation(
    boolean canCancel,
    boolean canReschedule,
    boolean canMarkNoShow,
    BigDecimal refundPreviewAmount,
    BigDecimal retainPreviewAmount,
    String currency,
    BookingSuggestedAction suggestedAction,
    List<BookingActionReasonCode> reasonCodes,
    String messageCode,
    Map<String, String> messageParams,
    String plainTextFallback
) {}

package com.plura.plurabackend.core.booking.actions;

import com.plura.plurabackend.core.booking.actions.model.BookingActionReasonCode;
import com.plura.plurabackend.core.booking.actions.model.BookingSuggestedAction;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * BookingActionsEvaluation es un modelo inmutable del modulo reservas / acciones.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas.
 */
public record BookingActionsEvaluation(
    boolean canCancel,
    boolean canReschedule,
    boolean canMarkNoShow,
    boolean canComplete,
    BigDecimal refundPreviewAmount,
    BigDecimal retainPreviewAmount,
    String currency,
    BookingSuggestedAction suggestedAction,
    List<BookingActionReasonCode> reasonCodes,
    String messageCode,
    Map<String, String> messageParams,
    String plainTextFallback
) {}

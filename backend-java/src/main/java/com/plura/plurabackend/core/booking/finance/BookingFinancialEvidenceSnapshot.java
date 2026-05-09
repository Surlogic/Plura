package com.plura.plurabackend.core.booking.finance;

import com.plura.plurabackend.core.booking.finance.model.BookingFinancialStatus;
import java.math.BigDecimal;

/**
 * BookingFinancialEvidenceSnapshot es un modelo inmutable del modulo reservas / finanzas.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas.
 */
public record BookingFinancialEvidenceSnapshot(
    BigDecimal amountCharged,
    BigDecimal amountHeld,
    BigDecimal amountToRefund,
    BigDecimal amountRefunded,
    BigDecimal amountToRelease,
    BigDecimal amountReleased,
    BookingFinancialStatus financialStatus,
    boolean hasFailedCharge,
    boolean hasFailedRefund,
    boolean hasFailedPayout
) {}

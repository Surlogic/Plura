package com.plura.plurabackend.core.booking.finance;

import com.plura.plurabackend.core.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.core.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.core.booking.finance.model.BookingRefundRecord;

/**
 * BookingFinanceUpdateResult es un modelo inmutable del modulo reservas / finanzas.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas.
 */
public record BookingFinanceUpdateResult(
    BookingFinancialSummary summary,
    BookingRefundRecord refundRecord,
    BookingPayoutRecord payoutRecord
) {}

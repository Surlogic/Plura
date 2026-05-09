package com.plura.plurabackend.core.booking.finance;

import java.util.List;

/**
 * BookingFinanceDispatchPlan es un modelo inmutable del modulo reservas / finanzas.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas, planes.
 */
public record BookingFinanceDispatchPlan(
    BookingFinanceUpdateResult localResult,
    List<String> providerOperationIds
) {
    /**
     * Evalua has proveedor operaciones y devuelve una decision booleana para el llamador.
     */
    public boolean hasProviderOperations() {
        return providerOperationIds != null && !providerOperationIds.isEmpty();
    }
}

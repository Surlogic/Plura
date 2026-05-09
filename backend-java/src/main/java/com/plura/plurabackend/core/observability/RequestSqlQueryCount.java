package com.plura.plurabackend.core.observability;

/**
 * RequestSqlQueryCount es un componente de dominio del modulo observabilidad.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
public final class RequestSqlQueryCount {

    private static final ThreadLocal<Integer> COUNTER = ThreadLocal.withInitial(() -> 0);
    private static final ThreadLocal<Boolean> ACTIVE = ThreadLocal.withInitial(() -> false);

    private RequestSqlQueryCount() {
    }

    /**
     * Ejecuta la logica de inicio manteniendola encapsulada en este componente.
     */
    public static void start() {
        ACTIVE.set(true);
        COUNTER.set(0);
    }

    /**
     * Ejecuta la logica de increment manteniendola encapsulada en este componente.
     */
    public static void increment() {
        if (Boolean.TRUE.equals(ACTIVE.get())) {
            COUNTER.set(COUNTER.get() + 1);
        }
    }

    /**
     * Ejecuta la logica de actual manteniendola encapsulada en este componente.
     */
    public static int current() {
        return COUNTER.get();
    }

    /**
     * Ejecuta la logica de clear manteniendola encapsulada en este componente.
     */
    public static void clear() {
        COUNTER.remove();
        ACTIVE.remove();
    }
}

package com.plura.plurabackend.core.observability;

public final class RequestSqlQueryCount {

    private static final ThreadLocal<Integer> COUNTER = ThreadLocal.withInitial(() -> 0);
    private static final ThreadLocal<Boolean> ACTIVE = ThreadLocal.withInitial(() -> false);

    private RequestSqlQueryCount() {
    }

    public static void start() {
        ACTIVE.set(true);
        COUNTER.set(0);
    }

    public static void increment() {
        if (Boolean.TRUE.equals(ACTIVE.get())) {
            COUNTER.set(COUNTER.get() + 1);
        }
    }

    public static int current() {
        return COUNTER.get();
    }

    public static void clear() {
        COUNTER.remove();
        ACTIVE.remove();
    }
}

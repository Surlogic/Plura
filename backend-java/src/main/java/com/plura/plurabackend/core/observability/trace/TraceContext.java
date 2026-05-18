package com.plura.plurabackend.core.observability.trace;

import org.slf4j.MDC;

public final class TraceContext {

    public static final String MDC_KEY = "traceId";
    public static final String REQUEST_ATTRIBUTE = "plura.traceId";
    public static final String HEADER = "X-Plura-Trace-Id";

    private TraceContext() {}

    public static String currentTraceId() {
        return MDC.get(MDC_KEY);
    }
}

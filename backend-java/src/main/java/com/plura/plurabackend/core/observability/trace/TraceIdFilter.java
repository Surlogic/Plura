package com.plura.plurabackend.core.observability.trace;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TraceIdFilter extends OncePerRequestFilter {

    private static final Pattern SAFE_TRACE_ID = Pattern.compile("^[A-Za-z0-9._:-]{8,128}$");

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String incomingTraceId = request.getHeader(TraceContext.HEADER);
        String traceId = isSafe(incomingTraceId) ? incomingTraceId.trim() : UUID.randomUUID().toString();
        request.setAttribute(TraceContext.REQUEST_ATTRIBUTE, traceId);
        response.setHeader(TraceContext.HEADER, traceId);
        MDC.put(TraceContext.MDC_KEY, traceId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(TraceContext.MDC_KEY);
        }
    }

    private boolean isSafe(String traceId) {
        return traceId != null && SAFE_TRACE_ID.matcher(traceId.trim()).matches();
    }
}

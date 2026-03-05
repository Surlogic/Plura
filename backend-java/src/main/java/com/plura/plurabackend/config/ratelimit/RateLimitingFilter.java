package com.plura.plurabackend.config.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Duration EVICTION_AGE = Duration.ofHours(2);
    private static final long CLEANUP_FREQUENCY = 1_000;
    private static final int MAX_BUCKETS = 20_000;
    private static final int TRIM_BATCH_SIZE = 500;

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> lastAccessEpochMs = new ConcurrentHashMap<>();
    private final AtomicLong requestCount = new AtomicLong(0);

    public RateLimitingFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        RateLimitTarget target = resolveTarget(request);
        if (target == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = target.keyPrefix() + ":" + target.identifier();
        Bucket bucket = buckets.computeIfAbsent(key, ignored -> newBucket(target.capacityPerMinute()));
        lastAccessEpochMs.put(key, System.currentTimeMillis());
        maybeCleanup();
        trimIfRequired();

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            response.setHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
            filterChain.doFilter(request, response);
            return;
        }

        long waitSeconds = Math.max(1L, probe.getNanosToWaitForRefill() / 1_000_000_000L);
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", String.valueOf(waitSeconds));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(Map.of(
            "timestamp", Instant.now().toString(),
            "status", HttpStatus.TOO_MANY_REQUESTS.value(),
            "error", "RATE_LIMIT_EXCEEDED",
            "message", "Demasiadas solicitudes. Intentá nuevamente en unos segundos.",
            "path", request.getRequestURI()
        )));
    }

    private Bucket newBucket(long capacityPerMinute) {
        Bandwidth bandwidth = Bandwidth.classic(
            capacityPerMinute,
            Refill.intervally(capacityPerMinute, Duration.ofMinutes(1))
        );
        return Bucket.builder().addLimit(bandwidth).build();
    }

    private RateLimitTarget resolveTarget(HttpServletRequest request) {
        String method = request.getMethod();
        String path = request.getRequestURI();

        if ("POST".equals(method) && ("/auth/login".equals(path) || path.startsWith("/auth/login/"))) {
            return new RateLimitTarget("login-ip", extractClientIp(request), 5);
        }
        if ("POST".equals(method) && ("/auth/register".equals(path) || path.startsWith("/auth/register/"))) {
            return new RateLimitTarget("register-ip", extractClientIp(request), 3);
        }
        if ("POST".equals(method) && path.matches("^/public/profesionales/[^/]+/reservas$")) {
            return new RateLimitTarget("booking-user", resolveUserOrIp(request), 10);
        }
        if ("GET".equals(method) && "/api/search".equals(path)) {
            return new RateLimitTarget("search-ip", extractClientIp(request), 60);
        }
        if ("GET".equals(method) && "/api/search/suggest".equals(path)) {
            return new RateLimitTarget("suggest-ip", extractClientIp(request), 120);
        }
        if ("POST".equals(method) && "/billing/checkout".equals(path)) {
            return new RateLimitTarget("billing-checkout", resolveUserOrIp(request), 6);
        }
        if ("POST".equals(method) && "/billing/cancel".equals(path)) {
            return new RateLimitTarget("billing-cancel", resolveUserOrIp(request), 6);
        }
        if ("POST".equals(method) && ("/webhooks/mercadopago".equals(path) || "/webhooks/dlocal".equals(path))) {
            return new RateLimitTarget("billing-webhook-ip", extractClientIp(request), 600);
        }
        return null;
    }

    private String resolveUserOrIp(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (
            authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() != null
        ) {
            return "user:" + authentication.getPrincipal().toString();
        }
        return "ip:" + extractClientIp(request);
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma >= 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private void maybeCleanup() {
        long current = requestCount.incrementAndGet();
        if (current % CLEANUP_FREQUENCY != 0) {
            return;
        }
        long cutoff = System.currentTimeMillis() - EVICTION_AGE.toMillis();
        lastAccessEpochMs.forEach((key, timestamp) -> {
            if (timestamp != null && timestamp < cutoff) {
                lastAccessEpochMs.remove(key, timestamp);
                buckets.remove(key);
            }
        });
    }

    private void trimIfRequired() {
        int overflow = buckets.size() - MAX_BUCKETS;
        if (overflow <= 0) {
            return;
        }
        int toRemove = Math.max(TRIM_BATCH_SIZE, overflow);
        lastAccessEpochMs.entrySet().stream()
            .sorted(Comparator.comparingLong(entry -> entry.getValue() == null ? Long.MIN_VALUE : entry.getValue()))
            .limit(toRemove)
            .forEach(entry -> {
                String key = entry.getKey();
                Long timestamp = entry.getValue();
                if (key == null || timestamp == null) {
                    return;
                }
                if (lastAccessEpochMs.remove(key, timestamp)) {
                    buckets.remove(key);
                }
            });
    }

    private record RateLimitTarget(String keyPrefix, String identifier, long capacityPerMinute) {}
}

package com.plura.plurabackend.config.security;

import com.plura.plurabackend.booking.ops.InternalOpsAccessService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;

@Component
public class InternalOpsActuatorAccessFilter extends OncePerRequestFilter {

    private static final String ACTUATOR_BASE_PATH = "/internal/ops/actuator";
    private static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";

    private final InternalOpsAccessService internalOpsAccessService;

    public InternalOpsActuatorAccessFilter(InternalOpsAccessService internalOpsAccessService) {
        this.internalOpsAccessService = internalOpsAccessService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null || !path.startsWith(ACTUATOR_BASE_PATH);
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            internalOpsAccessService.requireAuthorized(request.getHeader(INTERNAL_TOKEN_HEADER));
            filterChain.doFilter(request, response);
        } catch (ResponseStatusException exception) {
            response.sendError(exception.getStatusCode().value(), exception.getReason());
        }
    }
}

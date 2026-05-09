package com.plura.plurabackend.core.security;

import com.plura.plurabackend.core.booking.ops.InternalOpsAccessService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;

/**
 * InternalOpsActuatorAccessFilter es un filtro HTTP del modulo seguridad.
 * Responsabilidad: aplicar una regla transversal sobre cada request antes de llegar a los controllers.
 * Colabora con: internalOpsAccessService.
 * Foco funcional: paneles internos.
 */
@Component
public class InternalOpsActuatorAccessFilter extends OncePerRequestFilter {

    private static final String ACTUATOR_BASE_PATH = "/internal/ops/actuator";
    private static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";

    private final InternalOpsAccessService internalOpsAccessService;

    public InternalOpsActuatorAccessFilter(InternalOpsAccessService internalOpsAccessService) {
        this.internalOpsAccessService = internalOpsAccessService;
    }

    /**
     * Decide si corresponde not filter segun estado actual y reglas del dominio.
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null || !path.startsWith(ACTUATOR_BASE_PATH);
    }

    /**
     * Aplica el filtro al request actual antes de continuar la cadena HTTP.
     */
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

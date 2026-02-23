package com.plura.plurabackend.auth;

import com.plura.plurabackend.auth.dto.LoginRequest;
import com.plura.plurabackend.auth.dto.ProfesionalProfileResponse;
import com.plura.plurabackend.auth.dto.RegisterRequest;
import com.plura.plurabackend.auth.dto.RegisterProfesionalRequest;
import com.plura.plurabackend.auth.dto.RegisterResponse;
import org.springframework.http.HttpStatus;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    // Constructor injection to keep the controller immutable and testable.
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // Registro de clientes (alias /register).
    @PostMapping({"/register", "/register/cliente"})
    public RegisterResponse registerCliente(@Valid @RequestBody RegisterRequest request) {
        return authService.registerCliente(request);
    }

    // Registro de profesionales con campos específicos.
    @PostMapping("/register/profesional")
    public RegisterResponse registerProfesional(@Valid @RequestBody RegisterProfesionalRequest request) {
        return authService.registerProfesional(request);
    }

    @PostMapping({"/login", "/login/cliente"})
    public RegisterResponse loginCliente(@Valid @RequestBody LoginRequest request) {
        return authService.loginCliente(request);
    }

    @PostMapping("/login/profesional")
    public RegisterResponse loginProfesional(@Valid @RequestBody LoginRequest request) {
        return authService.loginProfesional(request);
    }

    @GetMapping("/me/profesional")
    public ProfesionalProfileResponse getProfesionalProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (
            authentication == null
                || !authentication.isAuthenticated()
                || authentication.getPrincipal() == null
                || authentication instanceof AnonymousAuthenticationToken
        ) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }
        String profesionalId = authentication.getPrincipal().toString();
        return authService.getProfesionalProfile(profesionalId);
    }
}

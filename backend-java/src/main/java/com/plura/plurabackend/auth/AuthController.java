package com.plura.plurabackend.auth;

import com.plura.plurabackend.auth.dto.RegisterRequest;
import com.plura.plurabackend.auth.dto.RegisterProfesionalRequest;
import com.plura.plurabackend.auth.dto.RegisterResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping({"/register", "/register/cliente"})
    public RegisterResponse registerCliente(@Valid @RequestBody RegisterRequest request) {
        return authService.registerCliente(request);
    }

    @PostMapping("/register/profesional")
    public RegisterResponse registerProfesional(@Valid @RequestBody RegisterProfesionalRequest request) {
        return authService.registerProfesional(request);
    }
}

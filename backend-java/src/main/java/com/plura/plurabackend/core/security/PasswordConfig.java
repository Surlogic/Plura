package com.plura.plurabackend.core.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * PasswordConfig es un configuracion Spring del modulo seguridad.
 * Responsabilidad: declarar beans, filtros o parametros transversales que necesita el runtime.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: contrasenas.
 */
@Configuration
public class PasswordConfig {

    /**
     * Ejecuta la logica de contrasena encoder manteniendola encapsulada en este componente.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt con factor de coste 12 para balancear seguridad y rendimiento.
        return new BCryptPasswordEncoder(12);
    }
}

package com.plura.plurabackend.health;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * HealthController es un controlador REST del modulo health.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: traduce requests/responses y evita mezclar reglas de negocio en la capa web.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
@RestController
public class HealthController {

    // Endpoint simple para verificar que la API responde.
    /**
     * Devuelve una respuesta minima para confirmar que el backend esta vivo.
     */
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}

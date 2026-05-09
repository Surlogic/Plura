package com.plura.plurabackend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Tests de pruebas generales del backend.
 * Cubren escenarios de plura backend application tests para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
@SpringBootTest(properties = {
	"SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
	"SPRING_DATASOURCE_USERNAME=sa",
	"SPRING_DATASOURCE_PASSWORD=",
	"SPRING_JPA_DDL_AUTO=create-drop",
	"JWT_SECRET=test-secret-for-context-load",
	"JWT_REFRESH_PEPPER=test-refresh-pepper",
	"APP_TIMEZONE=America/Montevideo",
	"CACHE_ENABLED=false",
	"SPRING_FLYWAY_ENABLED=false",
	"APP_RATE_LIMIT_ENABLED=false",
	"HIKARI_CONNECTION_INIT_SQL=SELECT 1",
	"SWAGGER_ENABLED=false",
})
class PluraBackendApplicationTests {

    /**
     * Escenario: contexto loads.
     * El objetivo es dejar explicita la regla que protege este test.
     */
	@Test
	void contextLoads() {
	}

}

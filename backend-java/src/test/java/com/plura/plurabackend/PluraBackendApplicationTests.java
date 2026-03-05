package com.plura.plurabackend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
	"SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
	"SPRING_DATASOURCE_USERNAME=sa",
	"SPRING_DATASOURCE_PASSWORD=",
	"SPRING_JPA_DDL_AUTO=create-drop",
	"JWT_SECRET=test-secret-for-context-load",
	"JWT_REFRESH_PEPPER=test-refresh-pepper",
	"APP_TIMEZONE=America/Montevideo",
	"CACHE_ENABLED=false",
	"HIKARI_CONNECTION_INIT_SQL=SELECT 1",
	"SWAGGER_ENABLED=false",
})
class PluraBackendApplicationTests {

	@Test
	void contextLoads() {
	}

}

package com.plura.plurabackend;

import io.github.cdimascio.dotenv.Dotenv;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Punto de entrada principal de la aplicación Plura Backend.
 * Configura Spring Boot con tareas programadas (@EnableScheduling)
 * y procesamiento asíncrono (@EnableAsync).
 * Antes de arrancar, carga variables de entorno desde un archivo .env.
 */
@SpringBootApplication
@EnableScheduling
@EnableAsync
public class PluraBackendApplication {

	/**
	 * Método principal que arranca la aplicación Spring Boot.
	 * Carga variables desde .env (si existe) y las inyecta como propiedades del sistema.
	 */
	public static void main(String[] args) {
		// Carga variables desde .env para entornos locales.
		// Soporta tanto ejecucion desde backend-java/ como desde la raiz del monorepo.
		Map<String, String> dotenvValues = loadDotenvValues();
		dotenvValues.forEach(PluraBackendApplication::applyDotenvFallback);
		applyDatasourceCompatibility(dotenvValues);
		SpringApplication.run(PluraBackendApplication.class, args);
	}

	private static void applyDatasourceCompatibility(Map<String, String> dotenvValues) {
		String configuredUrl = firstNonBlank(
			currentValue("SPRING_DATASOURCE_URL"),
			currentValue("DATABASE_URL"),
			dotenvValues.get("SPRING_DATASOURCE_URL"),
			dotenvValues.get("DATABASE_URL")
		);
		if (isBlank(configuredUrl)) {
			return;
		}

		ParsedDatasource parsedDatasource = normalizeDatasource(configuredUrl);
		if (!isBlank(parsedDatasource.jdbcUrl())
			&& !parsedDatasource.jdbcUrl().equals(currentValue("SPRING_DATASOURCE_URL"))) {
			System.setProperty("SPRING_DATASOURCE_URL", parsedDatasource.jdbcUrl());
		}

		if (isBlank(currentValue("SPRING_DATASOURCE_USERNAME"))
			&& isBlank(currentValue("DATABASE_USERNAME"))
			&& !isBlank(parsedDatasource.username())) {
			System.setProperty("SPRING_DATASOURCE_USERNAME", parsedDatasource.username());
		}

		if (isBlank(currentValue("SPRING_DATASOURCE_PASSWORD"))
			&& isBlank(currentValue("DATABASE_PASSWORD"))
			&& !isBlank(parsedDatasource.password())) {
			System.setProperty("SPRING_DATASOURCE_PASSWORD", parsedDatasource.password());
		}
	}

	private static Map<String, String> loadDotenvValues() {
		Path cwd = Path.of("").toAbsolutePath().normalize();
		List<Path> candidates = List.of(
			cwd.resolve(".env"),
			cwd.resolve("backend-java").resolve(".env")
		);

		Map<String, String> values = new LinkedHashMap<>();
		for (Path candidate : candidates) {
			Dotenv dotenv = Dotenv.configure()
				.directory(candidate.getParent().toString())
				.filename(candidate.getFileName().toString())
				.ignoreIfMissing()
				.load();
			dotenv.entries().forEach(entry -> values.putIfAbsent(entry.getKey(), entry.getValue()));
		}
		return values;
	}

	private static void applyDotenvFallback(String key, String value) {
		if (isBlank(currentValue(key)) && !isBlank(value)) {
			System.setProperty(key, value);
		}
	}

	private static String currentValue(String key) {
		return firstNonBlank(System.getProperty(key), System.getenv(key));
	}

	private static ParsedDatasource normalizeDatasource(String rawUrl) {
		if (isBlank(rawUrl) || rawUrl.startsWith("jdbc:")) {
			return new ParsedDatasource(rawUrl, null, null);
		}

		String normalizedUrl = rawUrl.replaceFirst("^postgres://", "postgresql://");
		if (!normalizedUrl.startsWith("postgresql://")) {
			return new ParsedDatasource(rawUrl, null, null);
		}

		URI uri = URI.create(normalizedUrl);
		StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://").append(uri.getHost());
		if (uri.getPort() != -1) {
			jdbcUrl.append(':').append(uri.getPort());
		}
		jdbcUrl.append(uri.getRawPath());
		if (!isBlank(uri.getRawQuery())) {
			jdbcUrl.append('?').append(uri.getRawQuery());
		}

		String username = null;
		String password = null;
		if (!isBlank(uri.getRawUserInfo())) {
			String[] userInfo = uri.getRawUserInfo().split(":", 2);
			username = decodeUrlComponent(userInfo[0]);
			password = userInfo.length > 1 ? decodeUrlComponent(userInfo[1]) : null;
		}

		return new ParsedDatasource(jdbcUrl.toString(), username, password);
	}

	private static String decodeUrlComponent(String value) {
		return URLDecoder.decode(value, StandardCharsets.UTF_8);
	}

	/** Verifica si un string es nulo o vacío. */
	private static boolean isBlank(String value) {
		return value == null || value.isBlank();
	}

	/** Retorna el primer valor no vacío de la lista, o null si todos son vacíos. */
	private static String firstNonBlank(String... values) {
		for (String value : values) {
			if (!isBlank(value)) {
				return value;
			}
		}
		return null;
	}

	private record ParsedDatasource(String jdbcUrl, String username, String password) {}
}

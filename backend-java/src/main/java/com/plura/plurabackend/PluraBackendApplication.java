package com.plura.plurabackend;

import io.github.cdimascio.dotenv.Dotenv;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Punto de entrada principal de la aplicación Plura Backend.
 * Configura Spring Boot con tareas programadas (@EnableScheduling)
 * y procesamiento asíncrono (@EnableAsync).
 * Antes de arrancar, carga variables de entorno desde un archivo .env
 * y aplica compatibilidad con configuraciones legacy de billing (DLocal).
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
		Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
		dotenv.entries().forEach(entry -> applyDotenvFallback(entry.getKey(), entry.getValue()));
		applyLegacyBillingCompatibility(dotenv);
		SpringApplication.run(PluraBackendApplication.class, args);
	}

	/**
	 * Migra las variables de entorno legacy de DLocal (DLOCAL_API_KEY, etc.)
	 * al nuevo formato con prefijo BILLING_DLOCAL_*.
	 * Esto permite mantener compatibilidad con despliegues anteriores
	 * sin necesidad de actualizar las variables de entorno manualmente.
	 */
	private static void applyLegacyBillingCompatibility(Dotenv dotenv) {
		Map<String, String> legacyValues = dotenv.entries().stream()
			.collect(java.util.stream.Collectors.toMap(
				io.github.cdimascio.dotenv.DotenvEntry::getKey,
				io.github.cdimascio.dotenv.DotenvEntry::getValue,
				(first, second) -> first
			));

		String legacyApiKey = firstNonBlank(
			currentValue("DLOCAL_API_KEY"),
			legacyValues.get("DLOCAL_API_KEY")
		);
		String legacySecretKey = firstNonBlank(
			currentValue("DLOCAL_SECRET_KEY"),
			legacyValues.get("DLOCAL_SECRET_KEY")
		);
		String legacyXTransKey = firstNonBlank(
			currentValue("DLOCAL_X_TRANS_KEY"),
			legacyValues.get("DLOCAL_X_TRANS_KEY")
		);
		String legacyEnv = firstNonBlank(
			currentValue("DLOCAL_ENV"),
			legacyValues.get("DLOCAL_ENV")
		);

		if (isBlank(currentValue("BILLING_DLOCAL_ENABLED"))
			&& !isBlank(legacyEnv)
			&& !isBlank(legacyApiKey)
			&& !isBlank(legacySecretKey)) {
			System.setProperty("BILLING_DLOCAL_ENABLED", "true");
		}

		applyLegacyFallback("BILLING_DLOCAL_X_LOGIN", legacyApiKey);
		applyLegacyFallback("BILLING_DLOCAL_X_TRANS_KEY", firstNonBlank(legacyXTransKey, legacySecretKey));
		applyLegacyFallback("BILLING_DLOCAL_SECRET_KEY", legacySecretKey);
		applyLegacyFallback("BILLING_DLOCAL_WEBHOOK_SECRET", legacySecretKey);
		applyLegacyFallback(
			"BILLING_DLOCAL_PAYOUT_CLIENT_ID",
			firstNonBlank(currentValue("DLOCAL_PAYOUT_CLIENT_ID"), legacyValues.get("DLOCAL_PAYOUT_CLIENT_ID"))
		);
		applyLegacyFallback(
			"BILLING_DLOCAL_PAYOUT_CLIENT_SECRET",
			firstNonBlank(currentValue("DLOCAL_PAYOUT_CLIENT_SECRET"), legacyValues.get("DLOCAL_PAYOUT_CLIENT_SECRET"))
		);
	}

	private static void applyDotenvFallback(String key, String value) {
		if (isBlank(currentValue(key)) && !isBlank(value)) {
			System.setProperty(key, value);
		}
	}

	/**
	 * Aplica un valor de respaldo para una propiedad del sistema si no está definida.
	 * @param targetKey clave destino de la propiedad del sistema
	 * @param fallbackValue valor legacy a usar si la clave destino está vacía
	 */
	private static void applyLegacyFallback(String targetKey, String fallbackValue) {
		if (isBlank(currentValue(targetKey)) && !isBlank(fallbackValue)) {
			System.setProperty(targetKey, fallbackValue);
		}
	}

	private static String currentValue(String key) {
		return firstNonBlank(System.getProperty(key), System.getenv(key));
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
}

package com.plura.plurabackend;

import io.github.cdimascio.dotenv.Dotenv;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class PluraBackendApplication {

	public static void main(String[] args) {
		// Carga variables desde .env para entornos locales.
		Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
		dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));
		applyLegacyBillingCompatibility(dotenv);
		SpringApplication.run(PluraBackendApplication.class, args);
	}

	private static void applyLegacyBillingCompatibility(Dotenv dotenv) {
		Map<String, String> legacyValues = dotenv.entries().stream()
			.collect(java.util.stream.Collectors.toMap(
				io.github.cdimascio.dotenv.DotenvEntry::getKey,
				io.github.cdimascio.dotenv.DotenvEntry::getValue,
				(first, second) -> first
			));

		String legacyApiKey = firstNonBlank(
			System.getProperty("DLOCAL_API_KEY"),
			legacyValues.get("DLOCAL_API_KEY")
		);
		String legacySecretKey = firstNonBlank(
			System.getProperty("DLOCAL_SECRET_KEY"),
			legacyValues.get("DLOCAL_SECRET_KEY")
		);
		String legacyEnv = firstNonBlank(
			System.getProperty("DLOCAL_ENV"),
			legacyValues.get("DLOCAL_ENV")
		);

		if (isBlank(System.getProperty("BILLING_DLOCAL_ENABLED"))
			&& !isBlank(legacyEnv)
			&& !isBlank(legacyApiKey)
			&& !isBlank(legacySecretKey)) {
			System.setProperty("BILLING_DLOCAL_ENABLED", "true");
		}

		applyLegacyFallback("BILLING_DLOCAL_X_LOGIN", legacyApiKey);
		applyLegacyFallback("BILLING_DLOCAL_X_TRANS_KEY", legacySecretKey);
		applyLegacyFallback("BILLING_DLOCAL_WEBHOOK_SECRET", legacySecretKey);
		applyLegacyFallback(
			"BILLING_DLOCAL_PAYOUT_CLIENT_ID",
			firstNonBlank(System.getProperty("DLOCAL_PAYOUT_CLIENT_ID"), legacyValues.get("DLOCAL_PAYOUT_CLIENT_ID"))
		);
		applyLegacyFallback(
			"BILLING_DLOCAL_PAYOUT_CLIENT_SECRET",
			firstNonBlank(System.getProperty("DLOCAL_PAYOUT_CLIENT_SECRET"), legacyValues.get("DLOCAL_PAYOUT_CLIENT_SECRET"))
		);
	}

	private static void applyLegacyFallback(String targetKey, String fallbackValue) {
		if (isBlank(System.getProperty(targetKey)) && !isBlank(fallbackValue)) {
			System.setProperty(targetKey, fallbackValue);
		}
	}

	private static boolean isBlank(String value) {
		return value == null || value.isBlank();
	}

	private static String firstNonBlank(String... values) {
		for (String value : values) {
			if (!isBlank(value)) {
				return value;
			}
		}
		return null;
	}
}

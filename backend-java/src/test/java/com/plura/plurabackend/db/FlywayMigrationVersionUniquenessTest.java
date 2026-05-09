package com.plura.plurabackend.db;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * Tests de migraciones y consistencia de base de datos.
 * Cubren escenarios de Flyway migracion version uniqueness para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class FlywayMigrationVersionUniquenessTest {

    private static final Pattern MIGRATION_PATTERN = Pattern.compile("^V([^_]+(?:_[^_]+)*)__.*\\.sql$");

    /**
     * Escenario: debe keep Flyway migracion versiones unico.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldKeepFlywayMigrationVersionsUnique() throws IOException, URISyntaxException {
        Path migrationsDir = Path.of(
            Objects.requireNonNull(
                FlywayMigrationVersionUniquenessTest.class.getClassLoader().getResource("db/migration"),
                "No se encontro el directorio de migraciones Flyway"
            ).toURI()
        );

        Map<String, String> versionsByFile = new LinkedHashMap<>();
        List<String> duplicates;
        try (Stream<Path> migrations = Files.list(migrationsDir)) {
            duplicates = migrations
                .filter(Files::isRegularFile)
                .map(path -> path.getFileName().toString())
                .sorted()
                .filter(name -> name.endsWith(".sql"))
                .filter(name -> MIGRATION_PATTERN.matcher(name).matches())
                .filter(name -> {
                    Matcher matcher = MIGRATION_PATTERN.matcher(name);
                    matcher.matches();
                    String version = matcher.group(1);
                    return versionsByFile.putIfAbsent(version, name) != null;
                })
                .map(name -> {
                    Matcher matcher = MIGRATION_PATTERN.matcher(name);
                    matcher.matches();
                    String version = matcher.group(1);
                    return "V" + version + ": " + versionsByFile.get(version) + " y " + name;
                })
                .toList();
        }

        assertEquals(List.of(), duplicates, () -> "Migraciones Flyway duplicadas: " + duplicates);
    }
}

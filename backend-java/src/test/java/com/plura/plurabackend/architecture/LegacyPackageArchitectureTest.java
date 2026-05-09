package com.plura.plurabackend.architecture;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * Tests de arquitectura y limites entre paquetes.
 * Cubren escenarios de legacy package architecture para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class LegacyPackageArchitectureTest {

    /**
     * Escenario: debe no contain legacy product plan package.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldNotContainLegacyProductPlanPackage() {
        var importedClasses = new ClassFileImporter()
            .withImportOption(new ImportOption.DoNotIncludeTests())
            .importPackages("com.plura.plurabackend");

        boolean hasLegacyPackage = importedClasses.stream()
            .anyMatch(javaClass -> javaClass.getPackageName().contains(".productplan"));

        assertTrue(!hasLegacyPackage, "No debe reaparecer el package legacy productplan");
    }

    /**
     * Escenario: debe keep only allowed top level packages.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldKeepOnlyAllowedTopLevelPackages() {
        var importedClasses = new ClassFileImporter()
            .withImportOption(new ImportOption.DoNotIncludeTests())
            .importPackages("com.plura.plurabackend");

        Set<String> allowedRoots = Set.of("config", "core", "health", "professional", "usuario");
        boolean hasUnexpectedRoot = importedClasses.stream()
            .map(javaClass -> javaClass.getPackageName())
            .filter(packageName -> packageName.startsWith("com.plura.plurabackend."))
            .map(packageName -> packageName.substring("com.plura.plurabackend.".length()))
            .map(packageName -> {
                int separator = packageName.indexOf('.');
                return separator >= 0 ? packageName.substring(0, separator) : packageName;
            })
            .anyMatch(root -> !allowedRoots.contains(root));

        assertTrue(!hasUnexpectedRoot, "No deben quedar paquetes funcionales fuera de core/usuario/professional");
    }

    /**
     * Escenario: debe no contain legacy scheduling directory.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldNotContainLegacySchedulingDirectory() {
        Path schedulingRoot = Path.of(
            "src",
            "main",
            "java",
            "com",
            "plura",
            "plurabackend",
            "scheduling"
        );
        assertTrue(!Files.exists(schedulingRoot), "No debe reaparecer el directorio legacy scheduling");
    }
}

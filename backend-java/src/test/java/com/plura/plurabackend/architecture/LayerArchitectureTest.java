package com.plura.plurabackend.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/**
 * Tests de arquitectura y limites entre paquetes.
 * Cubren escenarios de layer architecture para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
@AnalyzeClasses(
    packages = "com.plura.plurabackend",
    importOptions = {ImportOption.DoNotIncludeTests.class}
)
class LayerArchitectureTest {

    /**
     * Regla de arquitectura: core no debe depender de usuario.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
    @ArchTest
    static final ArchRule core_no_depends_on_usuario =
        noClasses()
            .that().resideInAPackage("..core..")
            .should().dependOnClassesThat().resideInAnyPackage("..usuario..");

    /**
     * Regla de arquitectura: professional no debe depender de usuario.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
    @ArchTest
    static final ArchRule professional_no_depends_on_usuario =
        noClasses()
            .that().resideInAPackage("..professional..")
            .should().dependOnClassesThat().resideInAnyPackage("..usuario..");

    /**
     * Regla de arquitectura: usuario no debe depender de professional internals.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
    @ArchTest
    static final ArchRule usuario_no_depends_on_professional_internals =
        noClasses()
            .that().resideInAPackage("..usuario..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "..professional.repository..",
                "..professional.profile..",
                "..professional.application..",
                "..professional.booking.."
            );
}

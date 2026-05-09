package com.plura.plurabackend.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/**
 * Tests de arquitectura y limites entre paquetes.
 * Cubren escenarios de plan architecture para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
@AnalyzeClasses(
    packages = "com.plura.plurabackend",
    importOptions = {ImportOption.DoNotIncludeTests.class}
)
class PlanArchitectureTest {

    /**
     * Regla de arquitectura: professional plan no debe depender de actor apis.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
    @ArchTest
    static final ArchRule professional_plan_no_depends_on_actor_apis =
        noClasses()
            .that().resideInAPackage("..professional.plan..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "..usuario..",
                "..professional.profile..",
                "..professional.booking..",
                "..core.auth.dto.."
            );
}

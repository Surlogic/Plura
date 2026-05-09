package com.plura.plurabackend.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/**
 * Tests de arquitectura y limites entre paquetes.
 * Cubren escenarios de favoritos architecture para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
@AnalyzeClasses(
    packages = "com.plura.plurabackend",
    importOptions = {ImportOption.DoNotIncludeTests.class}
)
class FavoritesArchitectureTest {

    /**
     * Regla de arquitectura: client favorite service no debe depender de professional internals.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
    @ArchTest
    static final ArchRule client_favorite_service_no_depends_on_professional_internals =
        noClasses()
            .that().haveSimpleName("ClientFavoriteService")
            .should().dependOnClassesThat().resideInAnyPackage(
                "..professional.repository..",
                "..professional.profile.ProfessionalCategorySupport",
                "..professional.model.."
            );
}

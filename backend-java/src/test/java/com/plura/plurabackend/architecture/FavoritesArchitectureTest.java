package com.plura.plurabackend.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(
    packages = "com.plura.plurabackend",
    importOptions = {ImportOption.DoNotIncludeTests.class}
)
class FavoritesArchitectureTest {

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

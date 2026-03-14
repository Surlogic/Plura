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
class LayerArchitectureTest {

    @ArchTest
    static final ArchRule core_no_depends_on_usuario =
        noClasses()
            .that().resideInAPackage("..core..")
            .should().dependOnClassesThat().resideInAnyPackage("..usuario..");

    @ArchTest
    static final ArchRule professional_no_depends_on_usuario =
        noClasses()
            .that().resideInAPackage("..professional..")
            .should().dependOnClassesThat().resideInAnyPackage("..usuario..");

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

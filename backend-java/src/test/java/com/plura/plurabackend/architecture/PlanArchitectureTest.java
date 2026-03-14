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
class PlanArchitectureTest {

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
